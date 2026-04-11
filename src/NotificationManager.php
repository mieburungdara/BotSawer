<?php

declare(strict_types=1);

namespace BotSawer;

use Telegram\Bot\Api;

class NotificationManager
{
    private static ?Api $telegram = null;

    public static function init(): void
    {
        if (self::$telegram === null) {
            // Get first active bot for notifications
            $bot = \Illuminate\Database\Capsule\Manager::table('bots')
                ->where('is_active', 1)
                ->first();

            if ($bot) {
                self::$telegram = new Api($bot->token);
            }
        }
    }

    public static function sendToUser(int $userId, string $message): bool
    {
        try {
            self::init();
            if (!self::$telegram) return false;

            $user = \Illuminate\Database\Capsule\Manager::table('users')
                ->where('id', $userId)
                ->first();

            if (!$user) return false;

            self::$telegram->sendMessage([
                'chat_id' => $user->telegram_id,
                'text' => $message,
                'parse_mode' => 'HTML'
            ]);

            Logger::info('Notification sent to user', ['user_id' => $userId]);
            return true;
        } catch (\Exception $e) {
            Logger::error('Failed to send notification to user', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    public static function notifyTopupApproved(int $userId, int $amount): void
    {
        $message = "✅ <b>Topup Berhasil!</b>\n\n";
        $message .= "💰 Jumlah: Rp " . number_format($amount, 0, ',', '.') . "\n";
        $message .= "📅 Waktu: " . date('d/m/Y H:i') . "\n\n";
        $message .= "Saldo Anda telah bertambah. Terima kasih!";

        self::sendToUser($userId, $message);
    }

    public static function notifyWithdrawalProcessed(int $userId, int $amount, string $status): void
    {
        $statusEmoji = $status === 'completed' ? '✅' : '❌';
        $statusText = $status === 'completed' ? 'Diproses' : 'Ditolak';

        $message = "{$statusEmoji} <b>Penarikan {$statusText}</b>\n\n";
        $message .= "💰 Jumlah: Rp " . number_format($amount, 0, ',', '.') . "\n";
        $message .= "📅 Waktu: " . date('d/m/Y H:i') . "\n";

        if ($status === 'completed') {
            $message .= "✅ Dana telah ditransfer ke rekening Anda\n";
        } else {
            $message .= "❌ Silakan hubungi admin untuk informasi lebih lanjut\n";
        }

        self::sendToUser($userId, $message);
    }

    public static function notifyCreatorDonation(int $creatorId, int $amount, int $mediaId): void
    {
        $message = "🎉 <b>Anda Menerima Donasi!</b>\n\n";
        $message .= "💰 Jumlah: Rp " . number_format($amount, 0, ',', '.') . "\n";
        $message .= "📱 Media: #" . $mediaId . "\n";
        $message .= "📅 Waktu: " . date('d/m/Y H:i') . "\n\n";
        $message .= "Terima kasih atas konten Anda! 🎨";

        self::sendToUser($creatorId, $message);
    }

    public static function notifyDonor(int $userId, int $amount): void
    {
        $message = "💝 <b>Donasi Berhasil!</b>\n\n";
        $message .= "🙏 Terima kasih atas donasi sebesar Rp " . number_format($amount, 0, ',', '.') . "\n";
        $message .= "📅 Waktu: " . date('d/m/Y H:i') . "\n\n";
        $message .= "Donasi Anda telah diteruskan ke kreator.";

        self::sendToUser($userId, $message);
    }

    public static function notifyAdminPendingAction(string $type, int $count): void
    {
        // Get all active admin users
        $admins = \Illuminate\Database\Capsule\Manager::table('admins')
            ->join('users', 'admins.telegram_id', '=', 'users.telegram_id')
            ->where('admins.is_active', 1)
            ->select('users.id', 'admins.telegram_id')
            ->get();

        if ($admins->isEmpty()) {
            Logger::warning('No active admins to notify for pending actions');
            return;
        }

        $typeText = $type === 'topup' ? 'Topup' : 'Penarikan';
        $message = "⚠️ <b>Admin Alert</b>\n\n";
        $message .= "Ada {$count} {$typeText} pending yang perlu diperiksa\n";
        $message .= "📱 Buka panel admin untuk memproses\n\n";
        $message .= date('d/m/Y H:i') . " - {$count} pending";

        foreach ($admins as $admin) {
            self::sendToUser($admin->id, $message);
        }
    }

    public static function notifyCreatorVerified(int $creatorId): void
    {
        $message = "🎊 <b>Selamat! Akun Kreator Anda Sudah Diverifikasi</b>\n\n";
        $message .= "✅ Anda sekarang bisa upload konten\n";
        $message .= "📤 Kirim foto/video untuk mulai posting\n";
        $message .= "💰 Mulai terima donasi dari penggemar\n\n";
        $message .= "Selamat berkarya! 🎨";

        self::sendToUser($creatorId, $message);
    }

    public static function broadcastToAll(string $message, array $excludeUserIds = []): int
    {
        $users = \Illuminate\Database\Capsule\Manager::table('users')
            ->whereNotIn('id', $excludeUserIds)
            ->where('is_banned', 0)
            ->get();

        $sent = 0;
        foreach ($users as $user) {
            if (self::sendToUser($user->id, $message)) {
                $sent++;
            }
        }

        Logger::info('Broadcast sent', ['total_users' => count($users), 'sent' => $sent]);
        return $sent;
    }
}