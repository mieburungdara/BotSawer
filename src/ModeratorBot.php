<?php

declare(strict_types=1);

namespace BotSawer;

use Telegram\Bot\Api;
use Telegram\Bot\Objects\Update;
use Exception;

class ModeratorBot
{
    private Api $telegram;

    public function __construct(int $botId = 1)
    {
        $this->initializeBot($botId);
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

        // Verify admin access
        if (!AdminManager::isAdmin($userId)) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Akses ditolak. Anda bukan admin terdaftar.'
            ]);
            return;
        }

        $admin = AdminManager::getAdmin($userId);
        if (!$admin) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Admin data tidak ditemukan.'
            ]);
            return;
        }
        AdminManager::updateLastLogin($userId);

        // Log admin access to moderator bot
        AuditLogger::logAdminAction('access_moderator_bot', 'admin', $userId, [], [
            'message_text' => $text,
            'has_media' => $message->has('photo') || $message->has('video') || $message->has('document')
        ], $userId);

        Logger::info('Moderator bot admin access', [
            'admin_id' => $userId,
            'admin_role' => $admin->role,
            'message' => substr($text, 0, 100) // Log first 100 chars only
        ]);

        // Inform admin to use web panel
        $this->sendWebPanelRedirect($chatId, $admin);
    }

    private function sendWebPanelRedirect(int $chatId, object $admin): void
    {
        $roleText = $admin->role === AdminManager::ROLE_SUPER_ADMIN ? '👑 Super Admin' :
                    ($admin->role === AdminManager::ROLE_MODERATOR ? '🔧 Moderator' :
                    ($admin->role === AdminManager::ROLE_FINANCE ? '💰 Finance Admin' : '👤 Admin'));

        $message = "🤖 <b>MODERATOR BOT</b>\n";
        $message .= "Role: <b>{$roleText}</b>\n\n";
        $message .= "✅ <b>Selamat datang, " . htmlspecialchars($admin->full_name, ENT_QUOTES, 'UTF-8') . "!</b>\n\n";
        $message .= "Bot ini hanya untuk verifikasi admin access.\n";
        $message .= "Semua admin operations dilakukan via <b>Web Panel</b>.\n\n";
        $message .= "🌐 <b>Akses Web Panel:</b>\n";
        $message .= "https://yourdomain.com/public/webapp/\n\n";
        $message .= "📱 <b>Fitur tersedia di Web Panel:</b>\n";

        if (AdminManager::canModerate($admin->telegram_id)) {
            $message .= "• 📊 Dashboard & Statistics\n";
            $message .= "• 📋 Posting Queue Management\n";
            $message .= "• ✏️ Manual Content Posting\n";
            $message .= "• 👥 User & Creator Management\n";
        }

        if (AdminManager::canHandleFinance($admin->telegram_id)) {
            $message .= "• 💰 Payment Confirmations\n";
            $message .= "• 📈 Financial Reports\n";
            $message .= "• 💳 Wallet Adjustments\n";
        }

        if (AdminManager::isSuperAdmin($admin->telegram_id)) {
            $message .= "• 👑 Admin User Management\n";
            $message .= "• ⚙️ System Settings\n";
            $message .= "• 🤖 Bot Configuration\n";
            $message .= "• 📋 Audit Logs Review\n";
        }

        $message .= "\n🔐 <b>Access verified untuk role: {$roleText}</b>";

        $this->telegram->sendMessage([
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'HTML'
        ]);
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

    private function sendModeratorStats(int $chatId, object $admin): void
    {
        try {
            $stats = [
                'total_media' => \Illuminate\Database\Capsule\Manager::table('media_files')->count(),
                'queued' => \Illuminate\Database\Capsule\Manager::table('media_files')->where('status', 'queued')->count(),
                'scheduled' => \Illuminate\Database\Capsule\Manager::table('media_files')->where('status', 'scheduled')->count(),
                'posted_today' => \Illuminate\Database\Capsule\Manager::table('media_files')
                    ->where('status', 'posted')
                    ->whereDate('posted_at', \Carbon\Carbon::today())
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



    private function handleAdvancedAdminCommands(int $chatId, string $text, int $adminId, object $admin): void
    {
        if (!AdminManager::isSuperAdmin($adminId)) {
            $this->sendPermissionDenied($chatId);
            return;
        }

        $parts = explode(' ', $text);
        $command = $parts[1] ?? '';

        switch ($command) {
            case 'add':
                if (count($parts) >= 4) {
                    $telegramId = (int)($parts[2] ?? 0);
                    $role = $parts[3] ?? '';
                    $this->addAdmin($chatId, $telegramId, $role, $adminId);
                } else {
                    $this->telegram->sendMessage([
                        'chat_id' => $chatId,
                        'text' => '❌ Format: /admin add [telegram_id] [role: super_admin|moderator|finance]'
                    ]);
                }
                break;

            case 'list':
                $this->listAdmins($chatId);
                break;

            case 'remove':
                if (count($parts) >= 3) {
                    $adminToRemove = (int)($parts[2] ?? 0);
                    $this->removeAdmin($chatId, $adminToRemove, $adminId);
                } else {
                    $this->telegram->sendMessage([
                        'chat_id' => $chatId,
                        'text' => '❌ Format: /admin remove [admin_id]'
                    ]);
                }
                break;

            default:
                $this->sendAdminHelp($chatId);
                break;
        }
    }

    private function addAdmin(int $chatId, int $telegramId, string $role, int $addedBy): void
    {
        // Get user info from telegram (this is simplified, in real implementation you'd need to get user info)
        $username = "@user{$telegramId}"; // Placeholder
        $fullName = "Admin User"; // Placeholder

        if (AdminManager::addAdmin($telegramId, $username, $fullName, $role, $addedBy)) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => "✅ Admin berhasil ditambahkan!\n\nID: {$telegramId}\nRole: {$role}\n\nUser perlu restart bot untuk akses."
            ]);
        } else {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Gagal menambahkan admin.'
            ]);
        }
    }

    private function listAdmins(int $chatId): void
    {
        $admins = AdminManager::getAllAdmins();

        if (empty($admins)) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Tidak ada admin terdaftar.'
            ]);
            return;
        }

        $message = "👥 <b>DAFTAR ADMIN</b>\n\n";
        foreach ($admins as $admin) {
            $status = $admin->is_active ? '✅' : '❌';
            $roleEmoji = $admin->role === AdminManager::ROLE_SUPER_ADMIN ? '👑' :
                         ($admin->role === AdminManager::ROLE_MODERATOR ? '🔧' :
                         ($admin->role === AdminManager::ROLE_FINANCE ? '💰' : '👤'));

            $message .= "{$status} {$roleEmoji} " . htmlspecialchars($admin->full_name, ENT_QUOTES, 'UTF-8') . "\n";
            $message .= "├ ID: {$admin->telegram_id}\n";
            $message .= "├ Role: {$admin->role}\n";
            $message .= "└ Dibuat: " . date('d/m/Y', strtotime($admin->created_at)) . "\n\n";
        }

        $this->telegram->sendMessage([
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'HTML'
        ]);
    }

    private function removeAdmin(int $chatId, int $adminToRemove, int $removedBy): void
    {
        // Prevent self-removal
        $remover = AdminManager::getAdmin($removedBy);
        if ($remover && $remover->id == $adminToRemove) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Anda tidak bisa menghapus diri sendiri.'
            ]);
            return;
        }

        if (AdminManager::deactivateAdmin($adminToRemove, $removedBy)) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '✅ Admin berhasil dinonaktifkan.'
            ]);
        } else {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Gagal menonaktifkan admin.'
            ]);
        }
    }

    private function sendAdminHelp(int $chatId): void
    {
        $message = "🔧 <b>ADMIN MANAGEMENT HELP</b>\n\n";
        $message .= "<b>Commands (Super Admin Only):</b>\n";
        $message .= "/admin add [telegram_id] [role] - Add new admin\n";
        $message .= "/admin list - List all admins\n";
        $message .= "/admin remove [admin_id] - Deactivate admin\n\n";
        $message .= "<b>Roles:</b>\n";
        $message .= "• super_admin - Full access\n";
        $message .= "• moderator - Content management\n";
        $message .= "• finance - Payment management";

        $this->telegram->sendMessage([
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'HTML'
        ]);
    }

    private function sendModeratorHelp(int $chatId, object $admin): void
    {
        $message = "🤖 <b>MODERATOR BOT HELP</b>\n\n";
        $message .= "Bot ini <b>EKSKLUSIF untuk admin</b> mengelola content posting.\n";
        $message .= "Role Anda: <b>{$admin->role}</b>\n\n";
        $message .= "🔧 <b>Commands:</b>\n";
        $message .= "/mod_start - Welcome message\n";
        $message .= "/mod_stats - Posting statistics\n";

        if (AdminManager::canModerate($admin->telegram_id)) {
            $message .= "/mod_queue - View posting queue\n";
            $message .= "/mod_post [id] - Manual post media\n";
        }

        if (AdminManager::isSuperAdmin($admin->telegram_id)) {
            $message .= "\n👑 <b>Super Admin Commands:</b>\n";
            $message .= "/admin add/list/remove - Manage admins\n";
        }

        $message .= "\n⚠️ <i>Bot ini mengabaikan pesan dari non-admin</i>";

        $this->telegram->sendMessage([
            'chat_id' => $chatId,
            'text' => $message,
            'parse_mode' => 'HTML'
        ]);
    }

    private function sendPermissionDenied(int $chatId): void
    {
        $this->telegram->sendMessage([
            'chat_id' => $chatId,
            'text' => '❌ Akses ditolak. Anda tidak memiliki permission untuk command ini.'
        ]);
    }

    public function getTelegram(): Api
    {
        return $this->telegram;
    }
}