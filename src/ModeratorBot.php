<?php

declare(strict_types=1);

namespace BotSawer;

use Telegram\Bot\Api;
use Telegram\Bot\Objects\Update;
use Exception;
use Illuminate\Database\Capsule\Manager as DB;

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
            $bot = DB::table('bots')
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
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
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
                $userId = (int)$message->getFrom()->getId();

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

        if (!$text) {
            return; // Ignore non-text messages
        }

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













    private function addAdmin(int $chatId, int $telegramId, string $role, int $addedBy): void
    {
        // Check if user exists in database
        $user = DB::table('users')
            ->where('telegram_id', $telegramId)
            ->first();

        if (!$user) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ User belum pernah berinteraksi dengan bot. User harus start bot terlebih dahulu.'
            ]);
            return;
        }

        $username = $user->username ? "@{$user->username}" : "@user{$telegramId}";
        $fullName = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: 'Admin User';

        if (AdminManager::addAdmin($telegramId, $username, $fullName, $role, $addedBy)) {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => "✅ Admin berhasil ditambahkan!\n\nID: {$telegramId}\nNama: {$fullName}\nRole: {$role}\n\nUser perlu restart bot untuk akses."
            ]);
        } else {
            $this->telegram->sendMessage([
                'chat_id' => $chatId,
                'text' => '❌ Gagal menambahkan admin.'
            ]);
        }
    }











    public function getTelegram(): Api
    {
        return $this->telegram;
    }
}