<?php

declare(strict_types=1);

namespace BotSawer;

use Exception;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once __DIR__ . '/../../vendor/autoload.php';
Database::init();

// Start session for rate limiting
session_start();

// Rate limiting
$endpoint = basename(__FILE__);
$userId = $input['userId'] ?? $_SERVER['REMOTE_ADDR'];

if (!RateLimiter::check($endpoint, $userId)) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'message' => 'Terlalu banyak request. Coba lagi nanti.',
        'retry_after' => 3600
    ]);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['userId']) || !isset($input['action'])) {
        throw new Exception('Invalid request');
    }

    $userId = $input['userId'];
    $action = $input['action'];

// Check if user is admin (simple check)
    $user = \Illuminate\Database\Capsule\Manager::table('users')
        ->where('id', $input['userId'])
        ->first();

    // Define admin IDs (should be in config)
    $adminIds = [123456789]; // Replace with actual admin telegram IDs

            if (!$user || !in_array($user->telegram_id, $adminIds)) {
                throw new Exception('Unauthorized');
            }

            // Audit log admin access
            \BotSawer\AuditLogger::logAdminAction('access_admin_panel', [
                'action' => $action,
                'ip' => $_SERVER['REMOTE_ADDR']
            ], $userId);

    $response = [];

    switch ($action) {
        case 'stats':
            $totalUsers = \Illuminate\Database\Capsule\Manager::table('users')->count();
            $totalTransactions = \Illuminate\Database\Capsule\Manager::table('transactions')->count();
            $totalBalance = \Illuminate\Database\Capsule\Manager::table('wallets')->sum('balance');
            $pendingTopups = \Illuminate\Database\Capsule\Manager::table('payment_proofs')
                ->where('status', 'pending')->count();
            $pendingWithdrawals = \Illuminate\Database\Capsule\Manager::table('withdrawals')
                ->where('status', 'pending')->count();

            $response = [
                'total_users' => $totalUsers,
                'total_transactions' => $totalTransactions,
                'total_balance' => (int)$totalBalance,
                'pending_topups' => $pendingTopups,
                'pending_withdrawals' => $pendingWithdrawals
            ];
            break;

        case 'adjust_balance':
            if (!isset($input['targetUserId']) || !isset($input['amount']) || !isset($input['description'])) {
                throw new Exception('Missing parameters');
            }

            Database::transaction(function () use ($input, $userId) {
                // Adjust balance
                Wallet::updateBalance($input['targetUserId'], $input['amount']);

                // Record transaction
                \Illuminate\Database\Capsule\Manager::table('transactions')->insert([
                    'user_id' => $input['targetUserId'],
                    'type' => $input['amount'] > 0 ? 'deposit' : 'withdraw',
                    'amount' => abs($input['amount']),
                    'status' => 'success',
                    'description' => $input['description'] . ' (Admin adjustment)',
                    'from_user_id' => $userId
                ]);
            });

            // Audit log
            \BotSawer\AuditLogger::logAdminAction('adjust_balance', [
                'target_user_id' => $input['targetUserId'],
                'amount' => $input['amount'],
                'description' => $input['description']
            ], $userId);

            $response = ['message' => 'Saldo berhasil disesuaikan'];
            break;

        case 'search_users':
            $query = trim($input['query'] ?? '');
            $limit = min((int)($input['limit'] ?? 20), 50);

            if (strlen($query) < 2) {
                throw new Exception('Query minimal 2 karakter');
            }

            $users = \Illuminate\Database\Capsule\Manager::table('users')
                ->select('users.*', 'creators.display_name', 'creators.is_verified', 'wallets.balance')
                ->leftJoin('creators', 'users.id', '=', 'creators.user_id')
                ->leftJoin('wallets', 'users.id', '=', 'wallets.user_id')
                ->where(function($q) use ($query) {
                    $q->where('users.first_name', 'like', "%{$query}%")
                      ->orWhere('users.last_name', 'like', "%{$query}%")
                      ->orWhere('users.username', 'like', "%{$query}%")
                      ->orWhere('creators.display_name', 'like', "%{$query}%");
                })
                ->limit($limit)
                ->get()
                ->toArray();

            $response = array_map(function($user) {
                return [
                    'id' => $user->id,
                    'telegram_id' => $user->telegram_id,
                    'name' => trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')),
                    'username' => $user->username,
                    'is_creator' => !is_null($user->display_name),
                    'creator_name' => $user->display_name,
                    'is_verified' => (bool)$user->is_verified,
                    'balance' => (int)($user->balance ?? 0),
                    'is_banned' => (bool)$user->is_banned
                ];
            }, $users);
            break;

        case 'ban_user':
            $targetUserId = (int)($input['targetUserId'] ?? 0);
            $ban = (bool)($input['ban'] ?? true);

            if (!$targetUserId) {
                throw new Exception('User ID required');
            }

            \Illuminate\Database\Capsule\Manager::table('users')
                ->where('id', $targetUserId)
                ->update(['is_banned' => $ban ? 1 : 0]);

            // Audit log
            \BotSawer\AuditLogger::logAdminAction('user_ban_status_change', [
                'target_user_id' => $targetUserId,
                'banned' => $ban
            ], $userId);

            $response = ['message' => 'User ' . ($ban ? 'banned' : 'unbanned') . ' successfully'];
            break;

        case 'get_settings':
            $settings = \Illuminate\Database\Capsule\Manager::table('settings')
                ->get()
                ->keyBy('key')
                ->toArray();

            $response = array_map(function($setting) {
                return [
                    'key' => $setting->key,
                    'value' => $setting->value,
                    'description' => $setting->description
                ];
            }, $settings);
            break;

        case 'get_audit_logs':
            $limit = min((int)($input['limit'] ?? 50), 200);
            $entityType = $input['entity_type'] ?? null;
            $userId = isset($input['user_id']) ? (int)$input['user_id'] : null;

            $logs = \BotSawer\AuditLogger::getLogs($entityType, null, $userId, $limit);

            $response = array_map(function($log) {
                return [
                    'id' => $log->id,
                    'user_id' => $log->user_id,
                    'action' => $log->action,
                    'entity_type' => $log->entity_type,
                    'entity_id' => $log->entity_id,
                    'changes' => json_decode($log->changes, true),
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at
                ];
            }, $logs);
            break;

        case 'update_setting':
            $key = trim($input['key'] ?? '');
            $value = trim($input['value'] ?? '');

            if (!$key) {
                throw new Exception('Setting key required');
            }

            $oldSetting = \Illuminate\Database\Capsule\Manager::table('settings')
                ->where('key', $key)
                ->first();

            \Illuminate\Database\Capsule\Manager::table('settings')
                ->where('key', $key)
                ->update([
                    'value' => $value,
                    'updated_at' => now()
                ]);

            // Audit log setting change
            \BotSawer\AuditLogger::logAdminAction('update_setting', [
                'key' => $key,
                'old_value' => $oldSetting ? $oldSetting->value : null,
                'new_value' => $value
            ], $userId);

            $response = ['message' => 'Setting updated successfully'];
            break;

        case 'get_bots':
            $bots = \Illuminate\Database\Capsule\Manager::table('bots')
                ->select('id', 'name', 'username', 'is_active', 'created_at')
                ->get()
                ->toArray();

            $response = $bots;
            break;

        case 'add_bot':
            $name = trim($input['name'] ?? '');
            $username = trim($input['username'] ?? '');
            $token = trim($input['token'] ?? '');
            $webhookSecret = trim($input['webhook_secret'] ?? '');

            if (!$name || !$username || !$token) {
                throw new Exception('Name, username, and token are required');
            }

            $botId = \Illuminate\Database\Capsule\Manager::table('bots')->insertGetId([
                'name' => $name,
                'username' => $username,
                'token' => $token,
                'webhook_secret' => $webhookSecret,
                'is_active' => 1
            ]);

            // Audit log
            \BotSawer\AuditLogger::logAdminAction('add_bot', [
                'bot_id' => $botId,
                'name' => $name,
                'username' => $username
            ], $userId);

            $response = ['message' => 'Bot added successfully', 'bot_id' => $botId];
            break;

        case 'toggle_bot':
            $botId = (int)($input['bot_id'] ?? 0);
            $active = (bool)($input['active'] ?? false);

            if (!$botId) {
                throw new Exception('Bot ID required');
            }

            \Illuminate\Database\Capsule\Manager::table('bots')
                ->where('id', $botId)
                ->update(['is_active' => $active ? 1 : 0]);

            // Audit log
            \BotSawer\AuditLogger::logAdminAction('toggle_bot_status', [
                'bot_id' => $botId,
                'active' => $active
            ], $userId);

            $response = ['message' => 'Bot status updated'];
            break;

        case 'get_audit_logs':
            $limit = min((int)($input['limit'] ?? 50), 200);
            $entityType = $input['entity_type'] ?? null;
            $userIdFilter = isset($input['user_id']) ? (int)$input['user_id'] : null;

            $logs = \BotSawer\AuditLogger::getLogs($entityType, null, $userIdFilter, $limit);

            $response = array_map(function($log) {
                return [
                    'id' => $log->id,
                    'user_id' => $log->user_id,
                    'action' => $log->action,
                    'entity_type' => $log->entity_type,
                    'entity_id' => $log->entity_id,
                    'changes' => json_decode($log->changes, true),
                    'ip_address' => $log->ip_address,
                    'created_at' => $log->created_at
                ];
            }, $logs);
            break;

        case 'get_admins':
            if (!\BotSawer\AdminManager::isSuperAdmin($userId)) {
                throw new Exception('Access denied: Super admin required');
            }

            $admins = \BotSawer\AdminManager::getAllAdmins();
            $response = array_map(function($admin) {
                return [
                    'id' => $admin->id,
                    'telegram_id' => $admin->telegram_id,
                    'telegram_username' => $admin->telegram_username,
                    'full_name' => $admin->full_name,
                    'role' => $admin->role,
                    'is_active' => (bool)$admin->is_active,
                    'last_login' => $admin->last_login,
                    'created_at' => $admin->created_at
                ];
            }, $admins);
            break;

        case 'add_admin':
            if (!\BotSawer\AdminManager::isSuperAdmin($userId)) {
                throw new Exception('Access denied: Super admin required');
            }

            $telegramId = (int)($input['telegram_id'] ?? 0);
            $role = $input['role'] ?? '';
            $username = $input['username'] ?? '';
            $fullName = $input['full_name'] ?? '';

            if (\BotSawer\AdminManager::addAdmin($telegramId, $username, $fullName, $role, $userId)) {
                $response = ['message' => 'Admin added successfully'];
            } else {
                throw new Exception('Failed to add admin');
            }
            break;

        case 'update_admin_role':
            if (!\BotSawer\AdminManager::isSuperAdmin($userId)) {
                throw new Exception('Access denied: Super admin required');
            }

            $adminId = (int)($input['admin_id'] ?? 0);
            $newRole = $input['role'] ?? '';

            if (\BotSawer\AdminManager::updateAdminRole($adminId, $newRole, $userId)) {
                $response = ['message' => 'Admin role updated successfully'];
            } else {
                throw new Exception('Failed to update admin role');
            }
            break;

        case 'deactivate_admin':
            if (!\BotSawer\AdminManager::isSuperAdmin($userId)) {
                throw new Exception('Access denied: Super admin required');
            }

            $adminId = (int)($input['admin_id'] ?? 0);

            if (\BotSawer\AdminManager::deactivateAdmin($adminId, $userId)) {
                $response = ['message' => 'Admin deactivated successfully'];
            } else {
                throw new Exception('Failed to deactivate admin');
            }
            break;

        default:
            throw new Exception('Unknown action');
    }

    echo json_encode([
        'success' => true,
        'data' => $response
    ]);

} catch (Exception $e) {
    Logger::error('Admin API error', ['error' => $e->getMessage()]);
    echo json_encode([
        'success' => false,
        'message' => 'Admin operation failed'
    ]);
}