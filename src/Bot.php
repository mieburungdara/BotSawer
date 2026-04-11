<?php

declare(strict_types=1);

namespace BotSawer;

use Telegram\Bot\Api;
use Telegram\Bot\Objects\Update;
use Exception;

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
            $bot = \Illuminate\Database\Capsule\Manager::table('bots')
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
                'error' => $e->getMessage()
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
            \Illuminate\Database\Capsule\Manager::table('bots')
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
        $userId = $message->getFrom()->getId();

        Logger::info('Received message', [
            'chat_id' => $chatId,
            'user_id' => $userId,
            'text' => $text
        ]);

        // Ensure user exists in database
        $this->ensureUserExists($message->getFrom());

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
            $media = \Illuminate\Database\Capsule\Manager::table('media_files')
                ->where('id', $mediaId)
                ->where('is_active', 1)
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
                'error' => $e->getMessage()
            ]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => 'Terjadi kesalahan saat memproses media.'
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
            Logger::error('Error getting balance', ['user_id' => $userId, 'error' => $e->getMessage()]);
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
            $paymentMessageId = \Illuminate\Database\Capsule\Manager::table('settings')
                ->where('key', 'payment_info_message_id')
                ->value('value');

            $backupChannel = \Illuminate\Database\Capsule\Manager::table('settings')
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
            Logger::error('Topup command error', ['error' => $e->getMessage()]);

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
                'error' => $e->getMessage()
            ]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Terjadi kesalahan saat pendaftaran.'
            ]);
        }
    }



    private function showPendingPayments(int $chatId): void
    {
        // Show pending topups
        $pendingTopups = \Illuminate\Database\Capsule\Manager::table('payment_proofs')
            ->join('users', 'payment_proofs.user_id', '=', 'users.id')
            ->where('payment_proofs.status', 'pending')
            ->select('payment_proofs.*', 'users.first_name', 'users.last_name', 'users.username')
            ->get();

        $message = "💳 PENDING TOPUP:\n\n";
        if ($pendingTopups->isEmpty()) {
            $message .= "✅ Tidak ada topup pending\n";
        } else {
            foreach ($pendingTopups as $topup) {
                $userName = $topup->first_name . ($topup->last_name ? ' ' . $topup->last_name : '');
                $message .= "ID: {$topup->id}\n";
                $message .= "User: {$userName} (@{$topup->username})\n";
                $message .= "Jumlah: Rp " . number_format($topup->amount, 0, ',', '.') . "\n";
                $message .= "Konfirmasi: /admin confirm topup {$topup->id}\n";
                $message .= "Tolak: /admin reject topup {$topup->id} [alasan]\n\n";
            }
        }

        // Show pending withdrawals
        $pendingWithdrawals = \Illuminate\Database\Capsule\Manager::table('withdrawals')
            ->join('creators', 'withdrawals.creator_id', '=', 'creators.id')
            ->join('users', 'creators.user_id', '=', 'users.id')
            ->where('withdrawals.status', 'pending')
            ->select('withdrawals.*', 'users.first_name', 'users.last_name', 'users.username', 'creators.display_name')
            ->get();

        $message .= "\n💰 PENDING PENARIKAN:\n\n";
        if ($pendingWithdrawals->isEmpty()) {
            $message .= "✅ Tidak ada penarikan pending\n";
        } else {
            foreach ($pendingWithdrawals as $withdrawal) {
                $userName = $withdrawal->first_name . ($withdrawal->last_name ? ' ' . $withdrawal->last_name : '');
                $message .= "ID: {$withdrawal->id}\n";
                $message .= "Kreator: {$withdrawal->display_name} (@{$withdrawal->username})\n";
                $message .= "Jumlah: Rp " . number_format($withdrawal->amount, 0, ',', '.') . "\n";
                $message .= "Konfirmasi: /admin confirm withdraw {$withdrawal->id}\n";
                $message .= "Tolak: /admin reject withdraw {$withdrawal->id} [alasan]\n\n";
            }
        }

        $this->telegram->sendMessage([
            'chat_id' => $chatId,
            'text' => $message
        ]);
    }

    private function confirmPayment(int $chatId, string $type, int $id): void
    {
        try {
            if ($type === 'topup') {
                $proof = \Illuminate\Database\Capsule\Manager::table('payment_proofs')
                    ->where('id', $id)
                    ->where('status', 'pending')
                    ->first();

                if (!$proof) {
                    $this->telegram->sendMessage([
                        'chat_id' => $chatId,
                        'text' => '❌ Bukti pembayaran tidak ditemukan atau sudah diproses.'
                    ]);
                    return;
                }

                Database::transaction(function () use ($proof) {
                    // Add to user balance
                    Wallet::addBalance($proof->user_id, $proof->amount, 'Topup via bukti pembayaran');

                    // Update proof status
                    \Illuminate\Database\Capsule\Manager::table('payment_proofs')
                        ->where('id', $proof->id)
                        ->update([
                            'status' => 'approved',
                            'admin_id' => 1, // Current admin
                            'processed_at' => \Carbon\Carbon::now()
                        ]);
                });

                // Notify user
                NotificationManager::notifyTopupApproved($proof->user_id, $proof->amount);

                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '✅ Topup berhasil dikonfirmasi.'
                ]);

            } elseif ($type === 'withdraw') {
                $withdrawal = \Illuminate\Database\Capsule\Manager::table('withdrawals')
                    ->where('id', $id)
                    ->where('status', 'pending')
                    ->first();

                if (!$withdrawal) {
                    $this->telegram->sendMessage([
                        'chat_id' => $chatId,
                        'text' => '❌ Permintaan penarikan tidak ditemukan atau sudah diproses.'
                    ]);
                    return;
                }

                Database::transaction(function () use ($withdrawal) {
                    // Update withdrawal status
                    \Illuminate\Database\Capsule\Manager::table('withdrawals')
                        ->where('id', $withdrawal->id)
                        ->update([
                            'status' => 'completed',
                            'admin_note' => 'Dikonfirmasi admin',
                            'processed_at' => \Carbon\Carbon::now()
                        ]);

                    // Update transaction status
                    \Illuminate\Database\Capsule\Manager::table('transactions')
                        ->where('id', $withdrawal->transaction_id)
                        ->update(['status' => 'success']);
                });

                // Notify creator
                NotificationManager::notifyWithdrawalProcessed($withdrawal->creator_id, $withdrawal->amount, 'completed');

                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '✅ Penarikan berhasil dikonfirmasi.'
                ]);
            } else {
                $this->telegram->sendMessage([
                    'chat_id' => $chatId,
                    'text' => '❌ Tipe pembayaran tidak valid.'
                ]);
            }
        } catch (Exception $e) {
            Logger::error('Payment confirmation failed', [
                'type' => $type,
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Gagal memproses konfirmasi pembayaran.'
            ]);
        }
    }

    private function rejectPayment(int $chatId, string $type, int $id, string $reason): void
    {
        try {
            if ($type === 'topup') {
                \Illuminate\Database\Capsule\Manager::table('payment_proofs')
                    ->where('id', $id)
                    ->update([
                        'status' => 'rejected',
                        'admin_id' => 1,
                        'admin_note' => $reason,
                        'processed_at' => \Carbon\Carbon::now()
                    ]);

                $userId = \Illuminate\Database\Capsule\Manager::table('payment_proofs')
                    ->where('id', $id)
                    ->value('user_id');

                if ($userId) {
                    $this->telegram->sendMessage([
                        'chat_id' => $userId,
                        'text' => "❌ Topup Anda ditolak.\nAlasan: {$reason}\n\nSilakan periksa kembali bukti pembayaran Anda."
                    ]);
                }
            } elseif ($type === 'withdraw') {
                \Illuminate\Database\Capsule\Manager::table('withdrawals')
                    ->where('id', $id)
                    ->update([
                        'status' => 'rejected',
                        'admin_note' => $reason,
                        'processed_at' => \Carbon\Carbon::now()
                    ]);

                // Refund to creator balance
                $withdrawal = \Illuminate\Database\Capsule\Manager::table('withdrawals')
                    ->where('id', $id)
                    ->first();

                if ($withdrawal) {
                    Wallet::addBalance($withdrawal->creator_id, $withdrawal->amount, 'Refund penarikan ditolak');

                    $this->telegram->sendMessage([
                        'chat_id' => $withdrawal->creator_id,
                        'text' => "❌ Penarikan sebesar Rp " . number_format($withdrawal->amount, 0, ',', '.') . " ditolak.\nAlasan: {$reason}\n\nSaldo telah dikembalikan ke dompet Anda."
                    ]);
                }
            }

            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '✅ Pembayaran berhasil ditolak.'
            ]);
        } catch (Exception $e) {
            Logger::error('Payment rejection failed', [
                'type' => $type,
                'id' => $id,
                'error' => $e->getMessage()
            ]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Gagal menolak pembayaran.'
            ]);
        }
    }

    private function showPendingCreators(int $chatId): void
    {
        $pendingCreators = \Illuminate\Database\Capsule\Manager::table('creators')
            ->join('users', 'creators.user_id', '=', 'users.id')
            ->where('creators.is_verified', 0)
            ->select('creators.*', 'users.first_name', 'users.last_name', 'users.username')
            ->get();

        $message = "🎨 PENDING KREATOR:\n\n";
        if ($pendingCreators->isEmpty()) {
            $message .= "✅ Tidak ada kreator pending\n";
        } else {
            foreach ($pendingCreators as $creator) {
                $userName = $creator->first_name . ($creator->last_name ? ' ' . $creator->last_name : '');
                $message .= "ID: {$creator->id}\n";
                $message .= "Nama: {$creator->display_name}\n";
                $message .= "User: {$userName} (@{$creator->username})\n";
                $message .= "Verifikasi: /admin verify {$creator->id}\n\n";
            }
        }

        $this->telegram->sendMessage([
            'chat_id' => $chatId,
            'text' => $message
        ]);
    }

    private function verifyCreator(int $chatId, int $creatorId): void
    {
        $success = Creator::verifyCreator($creatorId, true);

        if ($success) {
            $creator = Creator::getProfile($creatorId);
            if ($creator) {
                NotificationManager::notifyCreatorVerified($creator->user_id);
            }

            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '✅ Kreator berhasil diverifikasi.'
            ]);
        } else {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Gagal memverifikasi kreator.'
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
        $message .= "/help - Bantuan ini\n\n";
        $message .= "💡 Kirim foto/video untuk upload sebagai kreator\n";
        $message .= "💸 Klik link di channel untuk melakukan sawer";

        $this->telegram->sendMessage([
            'chat_id' => $chatId,
            'text' => $message
        ]);
    }

    private function handleMediaUpload($message): void
    {
        try {
            $chatId = $message->getChat()->getId();
            $userId = $message->getFrom()->getId();

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
            $mediaId = $this->saveMediaToDatabase($creator->id, $mediaInfo);

            // Check and notify streak milestones
            $streakData = Creator::getStreakData($creator->id);
            $currentStreak = $streakData['current_streak'];
            $this->notifyStreakMilestone($creator->id, $currentStreak);

            // Forward to backup channel
            $this->forwardToBackupChannel($mediaInfo['file_id'], $mediaInfo['type'], $mediaInfo['caption']);

            // Add to posting queue
            $this->addToPostingQueue($mediaId);

            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => "✅ Media diterima dan masuk antrian posting!\n\nID Media: #{$mediaId}\nJenis: {$mediaInfo['type']}\nStatus: Dalam antrian"
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
                'error' => $e->getMessage()
            ]);
            $this->telegram->sendMessage([
                'chat_id' => $chatId ?? null,
                'text' => '❌ Gagal memproses upload media.'
            ]);
        }
    }

    private function extractMediaInfo($message): ?array
    {
        if ($message->has('photo')) {
            $photo = end($message->getPhoto()); // Get highest resolution
            return [
                'file_id' => $photo->getFileId(),
                'file_unique_id' => $photo->getFileUniqueId(),
                'type' => 'photo',
                'file_size' => $photo->getFileSize(),
                'caption' => $message->getCaption()
            ];
        } elseif ($message->has('video')) {
            $video = $message->getVideo();
            return [
                'file_id' => $video->getFileId(),
                'file_unique_id' => $video->getFileUniqueId(),
                'type' => 'video',
                'file_size' => $video->getFileSize(),
                'duration' => $video->getDuration(),
                'caption' => $message->getCaption()
            ];
        } elseif ($message->has('document')) {
            $document = $message->getDocument();
            $mimeType = $document->getMimeType();
            if (strpos($mimeType, 'image/') === 0 || strpos($mimeType, 'video/') === 0) {
                return [
                    'file_id' => $document->getFileId(),
                    'file_unique_id' => $document->getFileUniqueId(),
                    'type' => strpos($mimeType, 'image/') === 0 ? 'photo' : 'video',
                    'file_size' => $document->getFileSize(),
                    'mime_type' => $mimeType,
                    'caption' => $message->getCaption()
                ];
            }
        }

        return null;
    }

    private function saveMediaToDatabase(int $creatorId, array $mediaInfo): int
    {
        return \Illuminate\Database\Capsule\Manager::table('media_files')->insertGetId([
            'creator_id' => $creatorId,
            'telegram_file_id' => $mediaInfo['file_id'],
            'file_unique_id' => $mediaInfo['file_unique_id'],
            'file_type' => $mediaInfo['type'],
            'file_size' => $mediaInfo['file_size'] ?? 0,
            'mime_type' => $mediaInfo['mime_type'] ?? null,
            'duration' => $mediaInfo['duration'] ?? null,
            'caption' => $mediaInfo['caption'],
            'status' => 'queued'
        ]);
    }

    private function forwardToBackupChannel(string $fileId, string $type, ?string $caption): void
    {
        try {
            // Get backup channel from settings
            $backupChannel = \Illuminate\Database\Capsule\Manager::table('settings')
                ->where('key', 'backup_channel')
                ->value('value');

            if (!$backupChannel) {
                Logger::warning('Backup channel not configured');
                return;
            }

            if ($type === 'photo') {
                $this->telegram->sendPhoto([
                    'chat_id' => $backupChannel,
                    'photo' => $fileId,
                    'caption' => $caption ?? 'Backup media'
                ]);
            } elseif ($type === 'video') {
                $this->telegram->sendVideo([
                    'chat_id' => $backupChannel,
                    'video' => $fileId,
                    'caption' => $caption ?? 'Backup media'
                ]);
            }
        } catch (Exception $e) {
            Logger::error('Failed to forward to backup channel', ['error' => $e->getMessage()]);
        }
    }

    private function addToPostingQueue(int $mediaId): void
    {
        // Get last posted time to calculate next schedule
        $lastPosted = \Illuminate\Database\Capsule\Manager::table('media_files')
            ->where('status', 'posted')
            ->orderBy('posted_at', 'desc')
            ->value('posted_at');

        $nextSchedule = $lastPosted
            ? \Carbon\Carbon::parse($lastPosted)->addMinute()
            : \Carbon\Carbon::now();

        \Illuminate\Database\Capsule\Manager::table('media_files')
            ->where('id', $mediaId)
            ->update([
                'status' => 'scheduled',
                'scheduled_at' => $nextSchedule
            ]);
    }

    private function handlePaymentProof($message): void
    {
        // Implementation for payment proof will be added later
        $this->telegram->sendMessage([
            'chat_id' => $message->getChat()->getId(),
            'text' => '✅ Bukti pembayaran diterima, menunggu konfirmasi admin.'
        ]);
    }

    private function handleCallbackQuery($callbackQuery): void
    {
        $data = $callbackQuery->getData();
        $chatId = $callbackQuery->getMessage()->getChat()->getId();
        $userId = $callbackQuery->getFrom()->getId();

        if (strpos($data, 'sawer_') === 0) {
            $this->handleSawerCallback($data, $chatId, $userId);
        }

        $this->telegram->answerCallbackQuery([
            'callback_query_id' => $callbackQuery->getId()
        ]);
    }

    private function handleSawerCallback(string $data, int $chatId, int $userId): void
    {
        $parts = explode('_', $data);
        $amount = (int)$parts[1];
        $mediaId = (int)$parts[2];

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
            $media = \Illuminate\Database\Capsule\Manager::table('media_files')
                ->where('id', $mediaId)
                ->first();

            if ($media) {
                Database::transaction(function () use ($userId, $media, $amount, $mediaId) {
                    // Update balances directly
                    \Illuminate\Database\Capsule\Manager::table('wallets')
                        ->where('user_id', $userId)
                        ->decrement('balance', $amount);

                    \Illuminate\Database\Capsule\Manager::table('wallets')
                        ->where('user_id', $media->creator_id)
                        ->increment('balance', $amount);

                    // Record transaction
                    \Illuminate\Database\Capsule\Manager::table('transactions')->insert([
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

    private function notifyCreator(int $creatorId, int $amount, int $mediaId): void
    {
        try {
            $creatorChat = \Illuminate\Database\Capsule\Manager::table('users')
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
                'error' => $e->getMessage()
            ]);
        }
    }

    private function handleInlineQuery($inlineQuery): void
    {
        // Implementation for inline queries if needed
    }

    private function ensureUserExists($user): void
    {
        $telegramId = $user->getId();
        $existing = \Illuminate\Database\Capsule\Manager::table('users')
            ->where('telegram_id', $telegramId)
            ->first();

        if (!$existing) {
            \Illuminate\Database\Capsule\Manager::table('users')->insert([
                'telegram_id' => $telegramId,
                'first_name' => $user->getFirstName(),
                'last_name' => $user->getLastName(),
                'username' => $user->getUsername(),
                'language_code' => $user->getLanguageCode() ?? 'id'
            ]);
            Logger::info('New user registered', ['telegram_id' => $telegramId]);
        }
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
            $streakData = Creator::getStreakData($userId);
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
        $user = \Illuminate\Database\Capsule\Manager::table('users')->where('id', $creatorId)->first();
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
                    'error' => $e->getMessage()
                ]);
            }
        }
    }
}