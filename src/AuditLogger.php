<?php

declare(strict_types=1);

namespace BotSawer;

use Illuminate\Database\Capsule\Manager as DB;

class AuditLogger
{
    // Action constants
    const ACTION_CREATE = 'create';
    const ACTION_UPDATE = 'update';
    const ACTION_DELETE = 'delete';
    const ACTION_LOGIN = 'login';
    const ACTION_LOGOUT = 'logout';
    const ACTION_ADMIN_ACCESS = 'admin_access';
    const ACTION_BALANCE_ADJUST = 'balance_adjust';
    const ACTION_USER_BAN = 'user_ban';
    const ACTION_SETTING_CHANGE = 'setting_change';
    const ACTION_BOT_MANAGE = 'bot_manage';
    const ACTION_PAYMENT_CONFIRM = 'payment_confirm';
    const ACTION_WITHDRAWAL_REQUEST = 'withdrawal_request';

    public static function log(string $action, string $entityType, int $entityId, array $oldData = [], array $newData = [], ?int $userId = null, string $ipAddress = null): void
    {
        try {
            $changes = [];

            // Calculate changes
            foreach ($newData as $key => $value) {
                if (!isset($oldData[$key]) || $oldData[$key] != $value) {
                    $changes[$key] = [
                        'old' => $oldData[$key] ?? null,
                        'new' => $value
                    ];
                }
            }

            DB::table('audit_logs')->insert([
                'user_id' => $userId,
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'old_data' => json_encode($oldData),
                'new_data' => json_encode($newData),
                'changes' => json_encode($changes),
                'ip_address' => $ipAddress ?: ($_SERVER['REMOTE_ADDR'] ?? null),
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                'created_at' => \Carbon\Carbon::now()
            ]);

            Logger::info('Audit log created', [
                'action' => $action,
                'entity_type' => $entityType,
                'entity_id' => $entityId,
                'user_id' => $userId
            ]);

        } catch (\Exception $e) {
            Logger::error('Failed to create audit log', [
                'error' => $e->getMessage(),
                'action' => $action,
                'entity_type' => $entityType
            ]);
        }
    }

    public static function logAdminAction(string $action, array $details, ?int $adminId = null): void
    {
        self::log($action, 'admin', 0, [], $details, $adminId);
    }

    public static function logUserAction(string $action, int $userId, array $details = []): void
    {
        self::log($action, 'user', $userId, [], $details, $userId);
    }

    public static function logCreatorAction(string $action, int $creatorId, array $details = []): void
    {
        self::log($action, 'creator', $creatorId, [], $details, null);
    }

    public static function getLogs(string $entityType = null, int $entityId = null, int $userId = null, int $limit = 50): array
    {
        $query = DB::table('audit_logs')->orderBy('created_at', 'desc');

        if ($entityType) {
            $query->where('entity_type', $entityType);
        }

        if ($entityId) {
            $query->where('entity_id', $entityId);
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        return $query->limit($limit)->get()->toArray();
    }
}