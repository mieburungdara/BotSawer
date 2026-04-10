<?php

declare(strict_types=1);

namespace BotSawer;

use Telegram\Bot\Api;
use Telegram\Bot\Objects\Update;
use Exception;

class ModeratorBot
{
    private Api $telegram;
    private int $adminId;

    public function __construct(int $botId = 1)
    {
        $this->initializeBot($botId);
        $this->adminId = (int) ($_ENV['ADMIN_TELEGRAM_ID'] ?? 0);
    }

    private function initializeBot(int $botId): void
    {
        try {
            $bot = \Illuminate\Database\Capsule\Manager::table('bots')
                ->where('id', $botId)
                ->where('is_active', 1)
                ->first();

            if (!$bot) {
                throw new Exception("Moderator bot with ID {$botId} not found or inactive");
            }

            $this->telegram = new Api($bot->token);
            Logger::info('Moderator bot initialized successfully', ['bot_id' => $botId]);
        } catch (Exception $e) {
            Logger::error('Failed to initialize moderator bot', [
                'bot_id' => $botId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    public function handleUpdate(Update $update): void
    {
        try {
            Logger::debug('Moderator bot handling update', ['update_id' => $update->getUpdateId()]);

            // Only accept messages from admin
            if ($update->has('message')) {
                $message = $update->getMessage();
                $userId = $message->getFrom()->getId();

                if ($userId !== $this->adminId) {
                    Logger::warning('Unauthorized access to moderator bot', [
                        'user_id' => $userId,
                        'admin_id' => $this->adminId
                    ]);
                    return; // Ignore non-admin users
                }

                $this->handleAdminMessage($message);
            }
        } catch (Exception $e) {
            Logger::error('Moderator bot error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    private function handleAdminMessage($message): void
    {
        $chatId = $message->getChat()->getId();
        $text = $message->getText();
        $userId = $message->getFrom()->getId();

        Logger::info('Moderator bot admin command', [
            'admin_id' => $userId,
            'command' => $text
        ]);

        // Admin commands for moderator bot
        if ($text === '/mod_start') {
            $this->sendModeratorWelcome($chatId);
        } elseif (str_starts_with($text, '/mod_post')) {
            $this->handleManualPost($chatId, $text);
        } elseif (str_starts_with($text, '/mod_stats')) {
            $this->sendModeratorStats($chatId);
        } elseif (str_starts_with($text, '/mod_queue')) {
            $this->showPostingQueue($chatId);
        } elseif ($message->has('photo') || $message->has('video') || $message->has('document')) {
            $this->handleAdminMediaUpload($message);
        } else {
            $this->sendModeratorHelp($chatId);
        }
    }

    private function sendModeratorWelcome(int $chatId): void
    {
        $message = "🤖 <b>MODERATOR BOT</b>\n\n";
        $message .= "Bot ini khusus untuk admin mengelola content posting.\n\n";
        $message .= "📋 <b>Perintah Moderator:</b>\n";
        $message .= "/mod_start - Info bot moderator\n";
        $message .= "/mod_stats - Statistik posting\n";
        $message .= "/mod_queue - Lihat antrian posting\n";
        $message .= "/mod_post [media_id] - Post manual\n\n";
        $message .= "💡 <i>Kirim media untuk test posting</i>";

        $this->telegram->sendMessage([
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'HTML'
        ]);
    }

    private function handleManualPost(int $chatId, string $text): void
    {
        $parts = explode(' ', $text);
        if (count($parts) < 2) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Format: /mod_post [media_id]'
            ]);
            return;
        }

        $mediaId = (int) $parts[1];

        try {
            $media = \Illuminate\Database\Capsule\Manager::table('media_files')
                ->where('id', $mediaId)
                ->where('status', 'scheduled')
                ->first();

            if (!$media) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '❌ Media tidak ditemukan atau tidak dalam status scheduled'
                ]);
                return;
            }

            // Force post this media
            $this->postMediaToChannel($media);

            \Illuminate\Database\Capsule\Manager::table('media_files')
                ->where('id', $mediaId)
                ->update([
                    'status' => 'posted',
                    'posted_at' => now()
                ]);

            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => "✅ Media #{$mediaId} berhasil di-post ke channel publik"
            ]);

            AuditLogger::logAdminAction('manual_post', [
                'media_id' => $mediaId,
                'forced' => true
            ], $this->adminId);

        } catch (Exception $e) {
            Logger::error('Manual post failed', ['error' => $e->getMessage()]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Gagal post media'
            ]);
        }
    }

    private function postMediaToChannel($media): void
    {
        $publicChannel = \Illuminate\Database\Capsule\Manager::table('settings')
            ->where('key', 'public_channel')
            ->value('value');

        if (!$publicChannel) {
            throw new Exception('Public channel not configured');
        }

        $deeplink = "https://t.me/botsawer_bot?start=media_{$media->id}";
        $caption = $media->caption ?? 'Konten dari kreator';
        $caption .= "\n\n💸 Sawer → {$deeplink}";

        if ($media->file_type === 'photo') {
            $this->telegram->sendPhoto([
                'chat_id' => $publicChannel,
                'photo' => $media->telegram_file_id,
                'caption' => $caption
            ]);
        } elseif ($media->file_type === 'video') {
            $this->telegram->sendVideo([
                'chat_id' => $publicChannel,
                'video' => $media->telegram_file_id,
                'caption' => $caption
            ]);
        }
    }

    private function sendModeratorStats(int $chatId): void
    {
        try {
            $stats = [
                'total_media' => \Illuminate\Database\Capsule\Manager::table('media_files')->count(),
                'queued' => \Illuminate\Database\Capsule\Manager::table('media_files')->where('status', 'queued')->count(),
                'scheduled' => \Illuminate\Database\Capsule\Manager::table('media_files')->where('status', 'scheduled')->count(),
                'posted_today' => \Illuminate\Database\Capsule\Manager::table('media_files')
                    ->where('status', 'posted')
                    ->whereDate('posted_at', today())
                    ->count(),
                'total_earnings' => \Illuminate\Database\Capsule\Manager::table('transactions')
                    ->where('type', 'donation')
                    ->where('status', 'success')
                    ->sum('amount')
            ];

            $message = "📊 <b>MODERATOR STATISTICS</b>\n\n";
            $message .= "📁 Total Media: {$stats['total_media']}\n";
            $message .= "⏳ Dalam Antrian: {$stats['queued']}\n";
            $message .= "📅 Terjadwal: {$stats['scheduled']}\n";
            $message .= "📤 Posted Hari Ini: {$stats['posted_today']}\n";
            $message .= "💰 Total Pendapatan: Rp " . number_format($stats['total_earnings'], 0, ',', '.') . "\n";

            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => 'HTML'
            ]);

        } catch (Exception $e) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Gagal load statistics'
            ]);
        }
    }

    private function showPostingQueue(int $chatId): void
    {
        try {
            $queue = \Illuminate\Database\Capsule\Manager::table('media_files')
                ->whereIn('status', ['queued', 'scheduled'])
                ->orderBy('created_at', 'desc')
                ->limit(10)
                ->get();

            if ($queue->isEmpty()) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '📭 Antrian posting kosong'
                ]);
                return;
            }

            $message = "📋 <b>POSTING QUEUE</b>\n\n";
            foreach ($queue as $item) {
                $status = $item->status === 'queued' ? '⏳' : '📅';
                $scheduled = $item->scheduled_at ? date('d/m H:i', strtotime($item->scheduled_at)) : 'N/A';
                $message .= "{$status} #{$item->id} - {$item->file_type} ({$scheduled})\n";
            }

            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => $message,
                'parse_mode' => 'HTML'
            ]);

        } catch (Exception $e) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Gagal load queue'
            ]);
        }
    }

    private function handleAdminMediaUpload($message): void
    {
        $chatId = $message->getChat()->getId();

        try {
            // For moderator bot, admin can test posting directly
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '✅ Media diterima untuk test posting. Gunakan /mod_post [id] untuk post manual.'
            ]);

            // Could save as test media or handle differently
            Logger::info('Admin media upload to moderator bot', [
                'admin_id' => $this->adminId,
                'has_photo' => $message->has('photo'),
                'has_video' => $message->has('video')
            ]);

        } catch (Exception $e) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Error processing media'
            ]);
        }
    }

    private function sendModeratorHelp(int $chatId): void
    {
        $message = "🤖 <b>MODERATOR BOT HELP</b>\n\n";
        $message .= "Bot ini <b>EKSKLUSIF untuk admin</b> mengelola content posting.\n\n";
        $message .= "🔧 <b>Commands:</b>\n";
        $message .= "/mod_start - Welcome message\n";
        $message .= "/mod_stats - Posting statistics\n";
        $message .= "/mod_queue - View posting queue\n";
        $message .= "/mod_post [id] - Manual post media\n\n";
        $message .= "⚠️ <i>Bot ini mengabaikan pesan dari non-admin</i>";

        $this->telegram->sendMessage([
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'HTML'
        ]);
    }

    public function getTelegram(): Api
    {
        return $this->telegram;
    }
}