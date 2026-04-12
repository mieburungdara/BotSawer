<?php

declare(strict_types=1);

namespace BotSawer;

use Telegram\Bot\Api;
use Telegram\Bot\Objects\Update;
use Exception;
use Illuminate\Database\Capsule\Manager as DB;

class Bot
{
    private Api $telegram;
    private int $botId;

    public function __construct(int $botId = 1)
    {
        $this->botId = $botId;
        $this->initializeBot();
    }

    private function initializeBot(): void
    {
        try {
            // Get bot token from database
            $bot = DB::table('bots')
                ->where('id', $this->botId)
                ->where('is_active', 1)
                ->first();

            if (!$bot) {
                throw new Exception("Bot with ID {$this->botId} not found or inactive");
            }

            $this->telegram = new Api($bot->token);
            Logger::info('Bot initialized successfully', ['bot_id' => $this->botId, 'username' => $bot->username]);
        } catch (Exception $e) {
            Logger::error('Failed to initialize bot', [
                'bot_id' => $this->botId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    public function handleUpdate(Update $update): void
    {
        try {
            Logger::debug('Handling update', ['update_id' => $update->getUpdateId()]);

            if ($update->has('message')) {
                $this->handleMessage($update->getMessage());
            } elseif ($update->has('callback_query')) {
                $this->handleCallbackQuery($update->getCallbackQuery());
            } elseif ($update->has('inline_query')) {
                $this->handleInlineQuery($update->getInlineQuery());
            }

            // Update last request timestamp
            DB::table('bots')
                ->where('id', $this->botId)
                ->update(['last_request_at' => \Carbon\Carbon::now()]);
        } catch (Exception $e) {
            Logger::error('Error handling update', [
                'update_id' => $update->getUpdateId(),
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    private function handleMessage($message): void
    {
        $chatId = $message->getChat()->getId();
        $text = $message->getText();
        $telegramId = $message->getFrom()->getId();

        // Ensure user exists and get internal user ID
        $userId = $this->ensureUserExists($message->getFrom());
        if (!$userId) {
            Logger::error('Failed to ensure user exists', ['telegram_id' => $telegramId]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => 'Terjadi kesalahan saat memproses user. Silakan coba lagi.'
            ]);
            return;
        }

        Logger::info('Received message', [
            'chat_id' => $chatId,
            'user_id' => $userId,
            'telegram_id' => $telegramId,
            'text' => $text
        ]);

        if ($text === '/start') {
            $this->handleStartCommand($chatId, $userId, $text);
        } elseif ($text === '/saldo') {
            $this->handleSaldoCommand($chatId, $userId);
        } elseif ($text === '/topup') {
            $this->handleTopupCommand($chatId);
        } elseif ($text === '/help') {
            $this->handleHelpCommand($chatId);
        } elseif (strpos($text, '/register') === 0) {
            $this->handleRegisterCommand($chatId, $userId, $text);
        } elseif ($text === '/privacy' || $text === '/privasi') {
            $this->handlePrivacyCommand($chatId, $userId);
        } elseif (strpos($text, '/admin') === 0) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Admin commands tidak tersedia di bot ini. Gunakan bot moderator.'
            ]);
        } elseif ($message->has('photo') || $message->has('video') || $message->has('document')) {
            $this->handleMediaUpload($message);
        } elseif ($this->isPaymentProof($message)) {
            $this->handlePaymentProof($message);
        } else {
            $this->handleUnknownCommand($chatId);
        }
    }

    private function handleStartCommand(int $chatId, int $userId, string $text): void
    {
        $startParam = $this->extractStartParameter($text);

        if ($startParam && strpos($startParam, 'media_') === 0) {
            $mediaId = str_replace('media_', '', $startParam);
            $this->handleMediaAccess($chatId, $userId, (int)$mediaId);
        } elseif ($startParam && strpos($startParam, 'album_') === 0) {
            $groupId = str_replace('album_', '', $startParam);
            $this->handleAlbumAccess($chatId, $userId, $groupId);
        } else {
            $this->sendWelcomeMessage($chatId, $userId);
        }
    }

    private function extractStartParameter(string $text): ?string
    {
        if (preg_match('/\/start\s+(.+)/', $text, $matches)) {
            return $matches[1];
        }
        return null;
    }

    private function handleMediaAccess(int $chatId, int $userId, int $mediaId): void
    {
        try {
            $media = DB::table('media_files')
                ->where('id', $mediaId)
                ->first();

            if (!$media) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => 'Media tidak ditemukan atau tidak aktif.'
                ]);
                return;
            }

            // Check if user has balance for donation
            $balance = Wallet::getBalance($userId);
            if ($balance <= 0) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => "⚠️ Saldo anda saat ini adalah Rp 0\n💡 Untuk melakukan sawer silahkan lakukan topup terlebih dahulu\n👉 Kirim perintah /topup untuk mengisi saldo"
                ]);
                return;
            }

            // Send media with sawer button
            $this->sendMediaWithSawerButton($chatId, $media);
        } catch (Exception $e) {
            Logger::error('Error handling media access', [
                'chat_id' => $chatId,
                'user_id' => $userId,
                'media_id' => $mediaId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => 'Terjadi kesalahan saat memproses media.'
            ]);
        }
    }

    private function handleAlbumAccess(int $chatId, int $userId, string $groupId): void
    {
        try {
            $medias = DB::table('media_files')
                ->where('media_group_id', $groupId)
                ->where('status', 'posted')
                ->get();

            if ($medias->isEmpty()) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => 'Album tidak ditemukan atau tidak aktif.'
                ]);
                return;
            }

            // Check if user has balance for donation
            $balance = Wallet::getBalance($userId);
            if ($balance <= 0) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => "⚠️ Saldo anda saat ini adalah Rp 0\n💡 Untuk melakukan sawer silahkan lakukan topup terlebih dahulu\n👉 Kirim perintah /topup untuk mengisi saldo"
                ]);
                return;
            }

            // Send album with sawer button
            $this->sendAlbumWithSawerButton($chatId, $medias, $groupId);
        } catch (Exception $e) {
            Logger::error('Error handling album access', [
                'chat_id' => $chatId,
                'user_id' => $userId,
                'group_id' => $groupId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => 'Terjadi kesalahan saat memproses album.'
            ]);
        }
    }

    private function sendMediaWithSawerButton(int $chatId, $media): void
    {
        $caption = $media->caption ?? 'Media dari kreator';

        $keyboard = [
            'inline_keyboard' => [
                [
                    ['text' => '💸 100', 'callback_data' => 'sawer_100_' . $media->id],
                    ['text' => '💸 500', 'callback_data' => 'sawer_500_' . $media->id],
                    ['text' => '💸 1K', 'callback_data' => 'sawer_1000_' . $media->id],
                    ['text' => '💸 2K', 'callback_data' => 'sawer_2000_' . $media->id],
                    ['text' => '💸 5K', 'callback_data' => 'sawer_5000_' . $media->id],
                ],
                [
                    ['text' => '💸 10K', 'callback_data' => 'sawer_10000_' . $media->id],
                    ['text' => '💸 25K', 'callback_data' => 'sawer_25000_' . $media->id],
                    ['text' => '💸 50K', 'callback_data' => 'sawer_50000_' . $media->id],
                    ['text' => '💸 100K', 'callback_data' => 'sawer_100000_' . $media->id],
                ]
            ]
        ];

        if ($media->file_type === 'photo') {
            $this->telegram->sendPhoto([
                'chat_id' => $chatId,
                'photo' => $media->telegram_file_id,
                'caption' => $caption,
                'reply_markup' => json_encode($keyboard)
            ]);
        } elseif ($media->file_type === 'video') {
            $this->telegram->sendVideo([
                'chat_id' => $chatId,
                'video' => $media->telegram_file_id,
                'caption' => $caption,
                'reply_markup' => json_encode($keyboard)
            ]);
        }
    }

    private function sendAlbumWithSawerButton(int $chatId, $medias, string $groupId): void
    {
        $mediaArray = [];
        $captions = [];

        foreach ($medias as $media) {
            $mediaItem = [
                'type' => $media->file_type,
                'media' => $media->telegram_file_id
            ];

            if ($media->file_type === 'video') {
                // Videos might need additional params, but for now basic
            }

            $mediaArray[] = $mediaItem;

            // Collect all captions that exist
            if ($media->caption) {
                $captions[] = $media->caption;
            }
        }

        // Combine all captions with line breaks
        $caption = implode("\n\n", array_unique($captions));

        if (!empty($mediaArray)) {
            // Send media group
            $this->telegram->sendMediaGroup([
                'chat_id' => $chatId,
                'media' => json_encode($mediaArray)
            ]);

            // Send separate message with combined captions and sawer keyboard
            $keyboard = [
                'inline_keyboard' => [
                    [
                        ['text' => '💸 100', 'callback_data' => 'sawer_album_100_' . $groupId],
                        ['text' => '💸 500', 'callback_data' => 'sawer_album_500_' . $groupId],
                        ['text' => '💸 1K', 'callback_data' => 'sawer_album_1000_' . $groupId],
                        ['text' => '💸 2K', 'callback_data' => 'sawer_album_2000_' . $groupId],
                        ['text' => '💸 5K', 'callback_data' => 'sawer_album_5000_' . $groupId],
                    ],
                    [
                        ['text' => '💸 10K', 'callback_data' => 'sawer_album_10000_' . $groupId],
                        ['text' => '💸 25K', 'callback_data' => 'sawer_album_25000_' . $groupId],
                        ['text' => '💸 50K', 'callback_data' => 'sawer_album_50000_' . $groupId],
                        ['text' => '💸 100K', 'callback_data' => 'sawer_album_100000_' . $groupId],
                    ]
                ]
            ];

            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => $caption ?: 'Album dari kreator',
                'reply_markup' => json_encode($keyboard)
            ]);
        }
    }

    private function handleSaldoCommand(int $chatId, int $userId): void
    {
        try {
            $balance = Wallet::getBalance($userId);
            $message = "💼 INFORMASI SALDO ANDA\n━━━━━━━━━━━━━━━━━━━━━━━━\n";
            $message .= "💰 Saldo Tersedia: Rp " . number_format($balance, 0, ',', '.') . "\n";
            $message .= "━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
            $message .= "💡 Gunakan saldo ini untuk melakukan sawer ke kreator\n";
            $message .= "👉 Ketik /topup untuk menambah saldo";

            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => $message
            ]);
        } catch (Exception $e) {
            Logger::error('Error getting balance', ['user_id' => $userId, 'error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => 'Terjadi kesalahan saat mengambil data saldo.'
            ]);
        }
    }

    private function handleTopupCommand(int $chatId): void
    {
        try {
            // Get payment info message ID from backup channel
            $paymentMessageId = DB::table('settings')
                ->where('key', 'payment_info_message_id')
                ->value('value');

            $backupChannel = DB::table('settings')
                ->where('key', 'backup_channel')
                ->value('value');

            if (!$paymentMessageId || !$backupChannel) {
                throw new Exception('Payment info message ID or backup channel not configured');
            }

            // Forward the payment info message from backup channel to user
            $this->telegram->forwardMessage([
                'chat_id' => $chatId,
                'from_chat_id' => $backupChannel,
                'message_id' => (int)$paymentMessageId
            ]);

            // Send additional instructions
            $instructions = "💳 CARA TOPUP SALDO\n\n";
            $instructions .= "1. Transfer sesuai nominal yang diinginkan\n";
            $instructions .= "2. Screenshot bukti transfer\n";
            $instructions .= "3. Kirim screenshot ke bot ini dengan caption berisi nominal\n";
            $instructions .= "4. Admin akan memverifikasi dan menambah saldo Anda\n\n";
            $instructions .= "💰 Minimal topup: Rp 10.000";

            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => $instructions
            ]);

        } catch (Exception $e) {
            Logger::error('Topup command error', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);

            // Fallback to text-only message
            $message = "💳 TOPUP SALDO\n\n";
            $message .= "Kirim bukti screenshot transfer beserta nominal ke bot ini.\n";
            $message .= "Admin akan memverifikasi dan menambah saldo Anda.\n\n";
            $message .= "💰 Minimal topup: Rp 10.000\n";
            $message .= "🏦 Transfer ke rekening admin";

            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => $message
            ]);
        }
    }

    private function handleRegisterCommand(int $chatId, int $userId, string $text): void
    {
        try {
            // Check if already a creator
            $existingCreator = Creator::getProfile($userId);
            if ($existingCreator) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '✅ Anda sudah terdaftar sebagai kreator.'
                ]);
                return;
            }

            // Parse command: /register display_name
            $parts = explode(' ', $text, 2);
            if (count($parts) < 2 || empty(trim($parts[1]))) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '❌ Format: /register [nama tampilan Anda]'
                ]);
                return;
            }

            $displayName = trim($parts[1]);

            if (strlen($displayName) < 3 || strlen($displayName) > 50) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '❌ Nama tampilan harus 3-50 karakter.'
                ]);
                return;
            }

            // Register creator
            $success = Creator::register($userId, $displayName);

            if ($success) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => "✅ Pendaftaran kreator berhasil!\n\n📝 Nama: {$displayName}\n⏳ Status: Menunggu verifikasi admin\n\nKirim foto/video untuk mulai upload konten."
                ]);
            } else {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '❌ Gagal mendaftar sebagai kreator.'
                ]);
            }
        } catch (Exception $e) {
            Logger::error('Creator registration command failed', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Terjadi kesalahan saat pendaftaran.'
            ]);
        }
    }





    private function showAdminHelp(int $chatId): void
    {
        $message = "🔧 Admin Commands:\n\n";
        $message .= "/admin pending - Lihat pembayaran pending\n";
        $message .= "/admin confirm [topup|withdraw] [id] - Konfirmasi pembayaran\n";
        $message .= "/admin reject [topup|withdraw] [id] [alasan] - Tolak pembayaran\n";
        $message .= "/admin creators - Lihat kreator pending verifikasi\n";
        $message .= "/admin verify [creator_id] - Verifikasi kreator\n";

        $this->telegram->sendMessage([
            'chat_id' => $chatId,
            'text' => $message
        ]);
    }

    private function handleHelpCommand(int $chatId): void
    {
        $message = "🤖 Bantuan Bot Sawer\n\n";
        $message .= "📋 Perintah yang tersedia:\n";
        $message .= "/start - Mulai menggunakan bot\n";
        $message .= "/register [nama] - Daftar sebagai kreator\n";
        $message .= "/saldo - Lihat saldo Anda\n";
        $message .= "/topup - Isi saldo\n";
        $message .= "/privacy - Ubah pengaturan privasi\n";
        $message .= "/help - Bantuan ini\n\n";
        $message .= "💡 Kirim foto/video untuk upload sebagai kreator\n";
        $message .= "💸 Klik link di channel untuk melakukan sawer\n";
        $message .= "🔒 /privacy - Kontrol privasi ID Anda (default: private/anonim)";

        $this->telegram->sendMessage([
            'chat_id' => $chatId,
            'text' => $message
        ]);
    }

    private function handleMediaUpload($message): void
    {
        try {
            $chatId = $message->getChat()->getId();
            $telegramId = $message->getFrom()->getId();

            // Ensure user exists and get internal ID
            $userId = $this->ensureUserExists($message->getFrom());
            if (!$userId) {
                Logger::error('Failed to ensure user exists in media upload', ['telegram_id' => $telegramId]);
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => 'Terjadi kesalahan saat memproses user. Silakan coba lagi.'
                ]);
                return;
            }

            // Check if user is a creator
            $creator = Creator::getProfile($userId);
            if (!$creator) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '❌ Anda belum terdaftar sebagai kreator. Gunakan /register untuk mendaftar.'
                ]);
                return;
            }

            if ($creator->is_verified != 1) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '⏳ Akun kreator Anda belum diverifikasi. Silakan tunggu konfirmasi admin.'
                ]);
                return;
            }

            // Get media info
            $mediaInfo = $this->extractMediaInfo($message);
            if (!$mediaInfo) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '❌ Format media tidak didukung.'
                ]);
                return;
            }

            // Save to database
            $mediaId = $this->saveMediaToDatabase($this->botId, $creator->id, $userId, $mediaInfo);

            // Check and notify streak milestones
            $streakData = Creator::getStreakData($creator->id);
            $currentStreak = $streakData['current_streak'];
            $this->notifyStreakMilestone($creator->id, $currentStreak);

            // Forward to backup channel with metadata
            $this->forwardToBackupChannel($mediaId, $creator->id, $userId, $mediaInfo);

            // Add to posting queue
            $this->addToPostingQueue($mediaId);

            // Get queue information
            $queueInfo = $this->getQueueInfo($mediaId);

            // Create cancel button
            $keyboard = [
                'inline_keyboard' => [
                    [
                        ['text' => '❌ Batal Upload', 'callback_data' => 'cancel_media_' . $mediaId]
                    ]
                ]
            ];

            $message = "✅ Media diterima dan masuk antrian posting!\n\n";
            $message .= "🆔 ID Media: #{$mediaId}\n";
            $message .= "📎 Jenis: {$mediaInfo['type']}\n";
            if ($mediaInfo['media_group_id']) {
                $message .= "📚 Album: Ya\n";
            }
            $message .= "📊 Antrian: #{$queueInfo['position']}\n";
            $message .= "⏰ Estimasi Post: {$queueInfo['estimated_time']}\n\n";
            $message .= "💡 Gunakan tombol di bawah untuk membatalkan jika berubah pikiran.";

            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => $message,
                'reply_markup' => json_encode($keyboard)
            ]);

            Logger::info('Media uploaded successfully', [
                'user_id' => $userId,
                'creator_id' => $creator->id,
                'media_id' => $mediaId,
                'type' => $mediaInfo['type']
            ]);

        } catch (Exception $e) {
            Logger::error('Media upload failed', [
                'user_id' => $userId ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId ?? null,
                'text' => '❌ Gagal memproses upload media.'
            ]);
        }
    }

    private function extractMediaInfo($message): ?array
    {
        $baseInfo = [
            'media_group_id' => $message->getMediaGroupId()
        ];

        if ($message->has('photo')) {
            $photo = end($message->getPhoto()); // Get highest resolution
            return array_merge($baseInfo, [
                'file_id' => $photo->getFileId(),
                'file_unique_id' => $photo->getFileUniqueId(),
                'type' => 'photo',
                'file_size' => $photo->getFileSize(),
                'caption' => $message->getCaption()
            ]);
        } elseif ($message->has('video')) {
            $video = $message->getVideo();
            return array_merge($baseInfo, [
                'file_id' => $video->getFileId(),
                'file_unique_id' => $video->getFileUniqueId(),
                'type' => 'video',
                'file_size' => $video->getFileSize(),
                'duration' => $video->getDuration(),
                'caption' => $message->getCaption()
            ]);
        } elseif ($message->has('document')) {
            $document = $message->getDocument();
            $mimeType = $document->getMimeType();
            if (strpos($mimeType, 'image/') === 0 || strpos($mimeType, 'video/') === 0) {
                return array_merge($baseInfo, [
                    'file_id' => $document->getFileId(),
                    'file_unique_id' => $document->getFileUniqueId(),
                    'type' => strpos($mimeType, 'image/') === 0 ? 'photo' : 'video',
                    'file_size' => $document->getFileSize(),
                    'mime_type' => $mimeType,
                    'caption' => $message->getCaption()
                ]);
            }
        }

        return null;
    }

    private function saveMediaToDatabase(int $botId, int $creatorId, int $userId, array $mediaInfo): int
    {
        return DB::table('media_files')->insertGetId([
            'bot_id' => $botId,
            'creator_id' => $creatorId,
            'user_id' => $userId,
            'telegram_file_id' => $mediaInfo['file_id'],
            'file_unique_id' => $mediaInfo['file_unique_id'],
            'file_type' => $mediaInfo['type'],
            'caption' => $mediaInfo['caption'],
            'media_group_id' => $mediaInfo['media_group_id'],
            'status' => 'queued'
        ]);
    }

    private function forwardToBackupChannel(int $mediaId, int $creatorId, int $userId, array $mediaInfo): void
    {
        try {
            // Get backup channel from settings
            $backupChannel = DB::table('settings')
                ->where('key', 'backup_channel')
                ->value('value');

            if (!$backupChannel) {
                Logger::warning('Backup channel not configured');
                return;
            }

            // Get user and creator info
            $user = DB::table('users')->where('id', $userId)->first();
            $creator = DB::table('creators')->where('id', $creatorId)->first();

            // Create detailed caption for admin
            $adminCaption = "📁 **MEDIA BACKUP**\n\n";
            $adminCaption .= "🆔 Media ID: #{$mediaId}\n";
            $adminCaption .= "👤 User: {$user->first_name} {$user->last_name} (@{$user->username})\n";
            $adminCaption .= "🎨 Creator: {$creator->display_name}\n";
            $adminCaption .= "📅 Uploaded: " . \Carbon\Carbon::now()->format('Y-m-d H:i:s') . "\n";
            $adminCaption .= "📎 Type: {$mediaInfo['type']}\n";

            if ($mediaInfo['media_group_id']) {
                $adminCaption .= "📚 Album: Yes (Group ID: {$mediaInfo['media_group_id']})\n";
            } else {
                $adminCaption .= "📄 Single Media\n";
            }

            // File size and duration not stored in database anymore
            // Can be queried from Telegram API if needed in future

            if ($mediaInfo['caption']) {
                $adminCaption .= "\n💬 Caption:\n{$mediaInfo['caption']}\n";
            }

            $adminCaption .= "\n🔍 Status: Scheduled for posting";

            // Send media with detailed caption to backup channel
            if ($mediaInfo['type'] === 'photo') {
                $this->telegram->sendPhoto([
                    'chat_id' => $backupChannel,
                    'photo' => $mediaInfo['file_id'],
                    'caption' => $adminCaption,
                    'parse_mode' => 'Markdown'
                ]);
            } elseif ($mediaInfo['type'] === 'video') {
                $this->telegram->sendVideo([
                    'chat_id' => $backupChannel,
                    'video' => $mediaInfo['file_id'],
                    'caption' => $adminCaption,
                    'parse_mode' => 'Markdown'
                ]);
            }
        } catch (Exception $e) {
            Logger::error('Failed to forward to backup channel', ['error' => $e->getMessage(), 'trace' => $e->getTraceAsString()]);
        }
    }

    private function addToPostingQueue(int $mediaId): void
    {
        $media = DB::table('media_files')->where('id', $mediaId)->first();
        if (!$media) return;

        // If this media is part of an album, check if the album is already scheduled
        if ($media->media_group_id) {
            $existingScheduled = DB::table('media_files')
                ->where('media_group_id', $media->media_group_id)
                ->where('status', 'scheduled')
                ->exists();

            if ($existingScheduled) {
                // Album already scheduled, skip this media
                Logger::info('Album already scheduled, skipping duplicate', ['media_id' => $mediaId, 'group_id' => $media->media_group_id]);
                return;
            }
        }

        // Get last posted time to calculate next schedule
        $lastPosted = DB::table('media_files')
            ->where('status', 'posted')
            ->orderBy('posted_at', 'desc')
            ->value('posted_at');

        $nextSchedule = $lastPosted
            ? \Carbon\Carbon::parse($lastPosted)->addMinute()
            : \Carbon\Carbon::now();

        DB::table('media_files')
            ->where('id', $mediaId)
            ->update([
                'status' => 'scheduled',
                'scheduled_at' => $nextSchedule
            ]);
    }

    private function getQueueInfo(int $mediaId): array
    {
        // Get the scheduled time for this media
        $mediaScheduledAt = DB::table('media_files')
            ->where('id', $mediaId)
            ->value('scheduled_at');

        if (!$mediaScheduledAt) {
            return ['position' => 0, 'estimated_time' => 'Unknown'];
        }

        // Count how many media are scheduled before this one
        $position = DB::table('media_files')
            ->where('status', 'scheduled')
            ->where('scheduled_at', '<', $mediaScheduledAt)
            ->count() + 1;

        // Calculate estimated time
        $now = \Carbon\Carbon::now();
        $scheduledTime = \Carbon\Carbon::parse($mediaScheduledAt);
        $minutesUntilPost = $now->diffInMinutes($scheduledTime, false);

        if ($minutesUntilPost <= 0) {
            $estimatedTime = 'Segera';
        } elseif ($minutesUntilPost < 60) {
            $estimatedTime = $minutesUntilPost . ' menit lagi';
        } else {
            $hours = floor($minutesUntilPost / 60);
            $remainingMinutes = $minutesUntilPost % 60;
            $estimatedTime = $hours . ' jam';
            if ($remainingMinutes > 0) {
                $estimatedTime .= ' ' . $remainingMinutes . ' menit';
            }
            $estimatedTime .= ' lagi';
        }

        return [
            'position' => $position,
            'estimated_time' => $estimatedTime
        ];
    }

    private function handlePaymentProof($message): void
    {
        try {
            $chatId = $message->getChat()->getId();
            $userId = $message->getFrom()->getId();
            $caption = $message->getCaption() ?? '';
            $photo = $message->getPhoto();

            if (!$photo) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '❌ Bukti pembayaran harus berupa gambar.'
                ]);
                return;
            }

            // Parse amount from caption (expected format: "topup 50000" or just "50000")
            $amount = $this->parseAmountFromCaption($caption);
            if (!$amount || $amount < 10000) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '❌ Format caption salah. Gunakan: "topup [nominal]" (minimal Rp 10.000)'
                ]);
                return;
            }

            $fileId = end($photo)->getFileId();

            // Save payment proof to database
            $proofId = DB::table('payment_proofs')->insertGetId([
                'user_id' => $userId,
                'telegram_file_id' => $fileId,
                'amount' => $amount,
                'caption' => $caption,
                'status' => 'pending',
                'submitted_at' => \Carbon\Carbon::now()
            ]);

            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => "✅ Bukti pembayaran diterima!\n\n📋 ID Bukti: #{$proofId}\n💰 Nominal: Rp " . number_format($amount, 0, ',', '.') . "\n⏳ Status: Menunggu konfirmasi admin\n\nAdmin akan memverifikasi dan menambah saldo Anda."
            ]);

            Logger::info('Payment proof submitted', [
                'user_id' => $userId,
                'proof_id' => $proofId,
                'amount' => $amount
            ]);

        } catch (Exception $e) {
            Logger::error('Payment proof processing failed', [
                'user_id' => $userId ?? null,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId ?? null,
                'text' => '❌ Gagal memproses bukti pembayaran.'
            ]);
        }
    }

    private function parseAmountFromCaption(string $caption): ?int
    {
        // Try formats: "topup 50000", "50000", "Rp 50.000"
        if (preg_match('/(?:topup|rp)\s*([\d,]+)/i', $caption, $matches)) {
            return (int)str_replace([',', '.'], '', $matches[1]);
        }
        if (preg_match('/(\d+)/', $caption, $matches)) {
            return (int)$matches[1];
        }
        return null;
    }

    private function handleCallbackQuery($callbackQuery): void
    {
        $data = $callbackQuery->getData();
        $chatId = $callbackQuery->getMessage()->getChat()->getId();
        $userId = $callbackQuery->getFrom()->getId();

        if (strpos($data, 'sawer_') === 0) {
            $this->handleSawerCallback($data, $chatId, $userId);
        } elseif (strpos($data, 'sawer_album_') === 0) {
            $this->handleSawerAlbumCallback($data, $chatId, $userId);
        } elseif (strpos($data, 'cancel_media_') === 0) {
            $this->handleCancelMediaCallback($data, $chatId, $userId);
        }

        $this->telegram->answerCallbackQuery([
            'callback_query_id' => $callbackQuery->getId()
        ]);
    }

    private function handleSawerCallback(string $data, int $chatId, int $userId): void
    {
        $parts = explode('_', $data);
        if (count($parts) < 3) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Callback data tidak valid.'
            ]);
            return;
        }
        $amount = (int)$parts[1];
        $mediaId = (int)$parts[2];

        if ($amount <= 0) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Jumlah donasi tidak valid.'
            ]);
            return;
        }

        try {
            $balance = Wallet::getBalance($userId);
            if ($balance < $amount) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => "⚠️ Saldo tidak cukup. Saldo Anda: Rp " . number_format($balance, 0, ',', '.')
                ]);
                return;
            }

            // Process donation transaction
            $media = DB::table('media_files')
                ->where('id', $mediaId)
                ->first();

            if ($media) {
                Database::transaction(function () use ($userId, $media, $amount, $mediaId) {
                    // Use Wallet methods for consistent balance management and logging
                    Wallet::deductBalance($userId, $amount, 'Donasi ke kreator');
                    Wallet::addBalance($media->creator_id, $amount, 'Donasi dari sawer');

                    // Additional transaction record for media-specific tracking
                    DB::table('transactions')->insert([
                        'user_id' => $media->creator_id,
                        'media_id' => $mediaId,
                        'from_user_id' => $userId,
                        'type' => 'donation',
                        'amount' => $amount,
                        'status' => 'success',
                        'description' => 'Donasi dari sawer'
                    ]);
                });

                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => "✅ Terima kasih atas donasi sebesar Rp " . number_format($amount, 0, ',', '.') . "\nDonasi telah diteruskan ke kreator."
                ]);

                // Send push notifications
                NotificationManager::notifyDonor($userId, $amount);
                NotificationManager::notifyCreatorDonation($media->creator_id, $amount, $mediaId);
            } else {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '❌ Media tidak ditemukan.'
                ]);
            }
        } catch (Exception $e) {
            Logger::error('Error processing sawer', [
                'user_id' => $userId,
                'amount' => $amount,
                'media_id' => $mediaId,
                'error' => $e->getMessage()
            ]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => 'Terjadi kesalahan saat memproses donasi.'
            ]);
        }
    }

    private function handleSawerAlbumCallback(string $data, int $chatId, int $userId): void
    {
        $parts = explode('_', $data);
        if (count($parts) < 4) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Callback data tidak valid.'
            ]);
            return;
        }
        $amount = (int)$parts[2];
        $groupId = $parts[3];

        if ($amount <= 0) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Jumlah donasi tidak valid.'
            ]);
            return;
        }

        try {
            $balance = Wallet::getBalance($userId);
            if ($balance < $amount) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => "⚠️ Saldo tidak cukup. Saldo Anda: Rp " . number_format($balance, 0, ',', '.')
                ]);
                return;
            }

            // Get first media in album for creator info
            $media = DB::table('media_files')
                ->where('media_group_id', $groupId)
                ->first();

            if ($media) {
                Database::transaction(function () use ($userId, $media, $amount, $groupId) {
                    // Use Wallet methods for consistent balance management and logging
                    Wallet::deductBalance($userId, $amount, 'Donasi ke kreator');
                    Wallet::addBalance($media->creator_id, $amount, 'Donasi dari sawer');

                    // Additional transaction record for album-specific tracking
                    DB::table('transactions')->insert([
                        'user_id' => $media->creator_id,
                        'media_id' => $media->id, // Use first media ID
                        'from_user_id' => $userId,
                        'type' => 'donation',
                        'amount' => $amount,
                        'status' => 'success',
                        'description' => 'Donasi dari sawer album'
                    ]);
                });

                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => "✅ Terima kasih atas donasi sebesar Rp " . number_format($amount, 0, ',', '.') . "\nDonasi telah diteruskan ke kreator."
                ]);

                // Send push notifications
                NotificationManager::notifyDonor($userId, $amount);
                NotificationManager::notifyCreatorDonation($media->creator_id, $amount, $media->id);
            } else {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '❌ Album tidak ditemukan.'
                ]);
            }
        } catch (Exception $e) {
            Logger::error('Error processing album sawer', [
                'user_id' => $userId,
                'amount' => $amount,
                'group_id' => $groupId,
                'error' => $e->getMessage()
            ]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => 'Terjadi kesalahan saat memproses donasi.'
            ]);
        }
    }

    public function postApprovedContentToChannel(int $mediaId, string $channelId): void
    {
        try {
            // Get media details with creator info including privacy setting
            $media = DB::table('media_files')
                ->join('users', 'media_files.creator_id', '=', 'users.id')
                ->where('media_files.id', $mediaId)
                ->select('media_files.*', 'users.uuid', 'users.is_private')
                ->first();

            if (!$media) {
                throw new Exception('Media not found');
            }

            // Create deeplink (use username if available, otherwise use bot ID)
            $botData = DB::table('bots')
                ->where('id', $this->botId)
                ->first();

            $botIdentifier = $botData->username ?: "bot{$botData->id}";
            $deeplink = "https://t.me/{$botIdentifier}?start=media_{$mediaId}";

            // Create caption with deeplink and creator ID based on privacy setting
            $caption = $media->caption ?? 'Konten dari kreator';

            if ($media->is_private) {
                $caption .= "\n\n👤 Creator ID: Anonymous";
            } elseif ($media->uuid) {
                $caption .= "\n\n👤 Creator ID: {$media->uuid}";
            } else {
                // This should not happen as UUID is generated on user login
                Logger::warning('Creator without UUID found during posting', [
                    'creator_id' => $media->creator_id,
                    'media_id' => $mediaId
                ]);
                $caption .= "\n\n👤 Creator ID: Anonymous"; // Default to anonymous
            }

            $caption .= "\n💸 Sawer → {$deeplink}";

            // Post to channel (caption only, no media)
            $this->telegram->sendMessage([
                'chat_id' => $channelId,
                'text' => $caption,
                'parse_mode' => 'HTML'
            ]);

            // Update media status to posted
            DB::table('media_files')
                ->where('id', $mediaId)
                ->update([
                    'status' => 'posted',
                    'posted_at' => \Carbon\Carbon::now()
                ]);

            Logger::info('Content manually posted to channel', [
                'media_id' => $mediaId,
                'channel' => $channelId,
                'creator_uuid' => $media->uuid,
                'is_private' => $media->is_private
            ]);

        } catch (Exception $e) {
            Logger::error('Failed to post content to channel', [
                'media_id' => $mediaId,
                'channel' => $channelId,
                'error' => $e->getMessage()
            ]);
            throw $e;
        }
    }

    private function handleCancelMediaCallback(string $data, int $chatId, int $userId): void
    {
        $parts = explode('_', $data);
        if (count($parts) < 3) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Callback data tidak valid.'
            ]);
            return;
        }

        $mediaId = (int)$parts[2];

        try {
            // Check if media exists and belongs to user
            $media = DB::table('media_files')
                ->where('id', $mediaId)
                ->where('user_id', $userId)
                ->first();

            if (!$media) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '❌ Media tidak ditemukan atau Anda tidak memiliki akses.'
                ]);
                return;
            }

            // Check if media can be cancelled (only if not already posted)
            if (in_array($media->status, ['posted', 'cancelled'])) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '❌ Media tidak dapat dibatalkan. Status: ' . ucfirst($media->status)
                ]);
                return;
            }

            // Update status to cancelled
            DB::table('media_files')
                ->where('id', $mediaId)
                ->update(['status' => 'cancelled']);

            // Log the cancellation
            AuditLogger::log('media_cancelled', 'media_files', $mediaId, [], ['status' => 'cancelled'], $userId);

            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => "✅ Media #{$mediaId} berhasil dibatalkan.\n\nMedia tidak akan diposting ke channel publik."
            ]);

            Logger::info('Media cancelled by user', [
                'user_id' => $userId,
                'media_id' => $mediaId
            ]);

        } catch (Exception $e) {
            Logger::error('Error cancelling media', [
                'user_id' => $userId,
                'media_id' => $mediaId,
                'error' => $e->getMessage()
            ]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Terjadi kesalahan saat membatalkan media.'
            ]);
        }
    }

    private function notifyCreator(int $creatorId, int $amount, int $mediaId): void
    {
        try {
            $creatorChat = DB::table('users')
                ->where('id', $creatorId)
                ->value('telegram_id');

            if ($creatorChat) {
                $this->telegram->sendMessage([
                    'chat_id' => $creatorChat,
                    'text' => "✅ Anda menerima donasi sebesar Rp " . number_format($amount, 0, ',', '.') . "\nDari media: #" . $mediaId
                ]);
            }
        } catch (Exception $e) {
            Logger::error('Error notifying creator', [
                'creator_id' => $creatorId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }

    private function handleInlineQuery($inlineQuery): void
    {
        // Implementation for inline queries if needed
    }

    private function ensureUserExists($user): int
    {
        $telegramId = $user->getId();
        $existing = DB::table('users')
            ->where('telegram_id', $telegramId)
            ->first();

        if (!$existing) {
            $uuid = $this->generateUniqueId();
            $userId = DB::table('users')->insertGetId([
                'uuid' => $uuid,
                'telegram_id' => $telegramId,
                'first_name' => $user->getFirstName(),
                'last_name' => $user->getLastName(),
                'username' => $user->getUsername(),
                'language_code' => $user->getLanguageCode() ?? 'id'
            ]);

            if (!$userId) {
                Logger::error('Failed to create new user - insertGetId returned null', [
                    'telegram_id' => $telegramId,
                    'uuid' => $uuid
                ]);
                throw new Exception('Failed to create user account');
            }

            Logger::info('New user registered', ['telegram_id' => $telegramId, 'uuid' => $uuid, 'user_id' => $userId]);
            return $userId;
        } elseif (!$existing->uuid) {
            // Generate UUID for existing user without UUID
            try {
                $newUuid = $this->generateUniqueId();
                $updated = DB::table('users')
                    ->where('telegram_id', $telegramId)
                    ->whereNull('uuid')
                    ->update(['uuid' => $newUuid]);

                if ($updated > 0) {
                    Logger::info('Generated UUID for existing user', [
                        'user_id' => $existing->id,
                        'telegram_id' => $telegramId,
                        'uuid' => $newUuid
                    ]);
                } else {
                    Logger::warning('Failed to update UUID for existing user (possibly already updated)', [
                        'user_id' => $existing->id,
                        'telegram_id' => $telegramId
                    ]);
                }
            } catch (Exception $e) {
                Logger::error('Failed to generate UUID for existing user', [
                    'telegram_id' => $telegramId,
                    'error' => $e->getMessage()
                ]);
                // Don't throw here - user can still function without UUID for now
            }
        }

        return $existing->id;
    }

    private function generateUniqueId(): string
    {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        $length = mt_rand(6, 8); // Start with random length between 6-8 for better distribution
        $maxLength = 20; // Safety limit
        $attempts = 0;
        $maxAttempts = 1000; // Prevent infinite loop

        do {
            $id = '';
            for ($i = 0; $i < $length; $i++) {
                $id .= $chars[mt_rand(0, strlen($chars) - 1)];
            }

            // Check if this ID is already used
            try {
                $exists = DB::table('users')->where('uuid', $id)->exists();
            } catch (Exception $e) {
                Logger::error('Database error during UUID uniqueness check', [
                    'error' => $e->getMessage(),
                    'uuid_candidate' => $id
                ]);
                throw new Exception('Database error during UUID generation');
            }

            if ($exists) {
                $length = min($length + 1, $maxLength); // Increase length if not unique
            }

            $attempts++;
            if ($attempts >= $maxAttempts) {
                Logger::error('Failed to generate unique ID after maximum attempts', [
                    'max_attempts' => $maxAttempts,
                    'final_length' => $length
                ]);
                throw new Exception('Unable to generate unique ID after maximum attempts');
            }
        } while ($exists);

        // Final validation
        if (empty($id) || strlen($id) < 6 || strlen($id) > 20) {
            Logger::error('Generated invalid UUID', [
                'uuid' => $id,
                'length' => strlen($id)
            ]);
            throw new Exception('Generated UUID is invalid');
        }

        return $id;
    }

    private function isPaymentProof($message): bool
    {
        return $message->has('photo') && strpos(strtolower($message->getCaption() ?? ''), 'topup') !== false;
    }

    private function sendWelcomeMessage(int $chatId, int $userId): void
    {
        $message = "👋 Selamat datang di Bot Sawer!\n\n";
        $message .= "💡 Bot untuk donasi sukarela ke kreator konten\n";
        $message .= "💰 Lihat saldo Anda dengan /saldo\n";
        $message .= "📤 Upload media dengan mengirim foto/video\n";
        $message .= "💸 Lakukan sawer melalui link di channel publik\n\n";

        // Check if user is a verified creator and has streak >= 1
        $creator = Creator::getProfile($userId);
        if ($creator && $creator->is_verified == 1) {
            $streakData = Creator::getStreakData($creator->id);
            if ($streakData['current_streak'] >= 1) {
                $message .= "🔥 Streak Anda: {$streakData['current_streak']} hari ({$streakData['streak_badge']})\n";
                $message .= "Terus jaga semangat publishing konten!\n\n";
            }
        }

        $message .= "Ketik /help untuk bantuan lebih lanjut";

        $this->telegram->sendMessage([
            'chat_id' => $chatId,
            'text' => $message
        ]);
    }

    private function handlePrivacyCommand(int $chatId, int $userId): void
    {
        try {
            $user = DB::table('users')->where('id', $userId)->first();
            if (!$user) {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '❌ User tidak ditemukan.'
                ]);
                return;
            }

            $newPrivacy = $user->is_private ? 0 : 1;

            $generatedUuid = null;

            // If switching to public mode and user doesn't have UUID, generate one
            if (!$newPrivacy && !$user->uuid) {
                try {
                    $generatedUuid = $this->generateUniqueId();
                    DB::table('users')
                        ->where('id', $userId)
                        ->update([
                            'uuid' => $generatedUuid,
                            'is_private' => $newPrivacy
                        ]);
                    Logger::info('Generated UUID when switching to public mode', [
                        'user_id' => $userId,
                        'uuid' => $generatedUuid
                    ]);
                } catch (Exception $e) {
                    Logger::error('Failed to generate UUID when switching to public mode', [
                        'user_id' => $userId,
                        'error' => $e->getMessage()
                    ]);
                    $this->telegram->sendMessage([
                        'chat_id' => $chatId,
                        'text' => '❌ Gagal mengubah pengaturan privasi. Silakan coba lagi.'
                    ]);
                    return;
                }
            } else {
                DB::table('users')
                    ->where('id', $userId)
                    ->update(['is_private' => $newPrivacy]);
            }

            $statusText = $newPrivacy ? '🔒 Privat' : '🌐 Publik';
            $message = "✅ Pengaturan privasi berhasil diubah!\n\n";
            $message .= "Status: {$statusText}\n\n";

            if ($newPrivacy) {
                $message .= "📝 Sekarang ID Anda akan tampil sebagai 'Anonymous' di postingan publik.\n";
                $message .= "🔒 Mode privasi aktif - ID Anda tersembunyi dari publik.\n";
            } else {
                $userUuid = $user->uuid ?? $generatedUuid ?? 'Unknown';
                $message .= "📝 Sekarang ID unik Anda ({$userUuid}) akan tampil di postingan publik.\n";
                $message .= "🌐 Mode publik aktif - ID unik Anda terlihat oleh semua orang.\n";
            }

            $message .= "💡 Gunakan /privacy lagi untuk mengubah pengaturan.";

            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => $message
            ]);

            Logger::info('User privacy setting changed', [
                'user_id' => $userId,
                'is_private' => $newPrivacy
            ]);

        } catch (Exception $e) {
            Logger::error('Privacy command failed', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Terjadi kesalahan saat mengubah pengaturan privasi.'
            ]);
        }
    }

    private function handleUnknownCommand(int $chatId): void
    {
        $this->telegram->sendMessage([
            'chat_id' => $chatId,
            'text' => 'Perintah tidak dikenal. Ketik /help untuk bantuan.'
        ]);
    }



    public function getTelegram(): Api
    {
        return $this->telegram;
    }

    private function notifyStreakMilestone(int $creatorId, int $newStreak): void
    {
        $user = DB::table('users')->where('id', $creatorId)->first();
        if (!$user || !$user->telegram_id) return;

        $messages = [
            3 => "🎉 Selamat! Kamu telah mencapai streak 3 hari! Terus jaga semangatmu! 🔥",
            7 => "🏆 Wow! 7 hari streak! Kamu luar biasa! Teruskan! ⭐",
            14 => "👑 Master streak 14 hari! Kamu adalah inspirasi! 💎",
            30 => "🌟 LEGENDA! 30 hari streak! Kamu tak terhentikan! 🏅"
        ];

        if (isset($messages[$newStreak])) {
            try {
                $this->telegram->sendMessage([
                    'chat_id' => $user->telegram_id,
                    'text' => $messages[$newStreak]
                ]);
                Logger::info('Streak milestone notification sent', [
                    'creator_id' => $creatorId,
                    'streak' => $newStreak
                ]);
            } catch (Exception $e) {
                Logger::error('Failed to send streak notification', [
                    'creator_id' => $creatorId,
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
            }
        }
    }
}