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
// Note: $input not defined yet, use REMOTE_ADDR for rate limiting
$userId = $_SERVER['REMOTE_ADDR'];

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

    // Check session authentication
    if (!isset($_SESSION['user_id']) || $_SESSION['user_id'] != $userId) {
        throw new Exception('Authentication required');
    }

// Check if user is admin using AdminManager
    $user = DB::table('users')
        ->where('id', $input['userId'])
        ->first();

    if (!$user || !AdminManager::isAdmin($user->telegram_id)) {
        throw new Exception('Unauthorized');
    }

    // Get admin role for permission checks
    $adminData = AdminManager::getAdmin($user->telegram_id);
    $adminRole = $adminData->role;

            // Audit log admin access
            \BotSawer\AuditLogger::logAdminAction('access_admin_panel', [
                'action' => $action,
                'ip' => $_SERVER['REMOTE_ADDR']
            ], $userId);

    $response = [];

    switch ($action) {
        case 'stats':
            $totalUsers = DB::table('users')->count();
            $totalTransactions = DB::table('transactions')->count();
            $totalBalance = DB::table('wallets')->sum('balance');
            $pendingTopups = DB::table('payment_proofs')
                ->where('status', 'pending')->count();
            $pendingWithdrawals = DB::table('withdrawals')
                ->where('status', 'pending')->count();

            // Additional stats for moderators
            $pendingContent = DB::table('media_files')
                ->where('status', 'pending')->count();
            $approvedToday = DB::table('media_files')
                ->where('status', 'approved')
                ->whereDate('updated_at', \Carbon\Carbon::today()->toDateString())->count();

            $response = [
                'total_users' => $totalUsers,
                'total_transactions' => $totalTransactions,
                'total_balance' => (int)$totalBalance,
                'pending_topups' => $pendingTopups,
                'pending_withdrawals' => $pendingWithdrawals,
                'pending_content' => $pendingContent,
                'approved_today' => $approvedToday
            ];
            break;

        case 'adjust_balance':
            if (!isset($input['targetUserId']) || !isset($input['amount']) || !isset($input['description'])) {
                throw new Exception('Missing parameters');
            }

            if ($input['amount'] == 0) {
                throw new Exception('Adjustment amount cannot be zero');
            }

            // Validate target user exists
            $targetUser = DB::table('users')->where('id', $input['targetUserId'])->first();
            if (!$targetUser) {
                throw new Exception('Target user not found');
            }

            $previousBalance = \BotSawer\Wallet::getBalance($input['targetUserId']);

            Database::transaction(function () use ($input, $userId) {
                // Update balance directly
                $amount = $input['amount'];
                DB::table('wallets')
                    ->where('user_id', $input['targetUserId'])
                    ->increment('balance', $amount);

                // Record transaction
                DB::table('transactions')->insert([
                    'user_id' => $input['targetUserId'],
                    'type' => 'admin_adjustment',
                    'amount' => abs($amount),
                    'status' => 'success',
                    'description' => $input['description'] . ' (Admin adjustment)',
                    'from_user_id' => $userId
                ]);
            });

            // Log audit
            \BotSawer\AuditLogger::logAdminAction('balance_adjustment', [
                'target_user_id' => $input['targetUserId'],
                'adjustment_amount' => $input['amount'],
                'previous_balance' => $previousBalance,
                'new_balance' => \BotSawer\Wallet::getBalance($input['targetUserId']),
                'description' => $input['description']
            ], $userId);

            $response = ['message' => 'Saldo berhasil disesuaikan'];
            break;

        case 'search_users':
            if (!AdminManager::canModerate($userId)) {
                throw new Exception('Access denied: Moderator admin required');
            }

            $query = trim($input['query'] ?? '');
            $limit = min((int)($input['limit'] ?? 20), 50);

            if (strlen($query) < 2) {
                throw new Exception('Query minimal 2 karakter');
            }

            $users = DB::table('users')
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
                    'is_creator' => DB::table('creators')->where('user_id', $user->id)->exists(),
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

            // Validate target user exists
            $targetUser = DB::table('users')->where('id', $targetUserId)->first();
            if (!$targetUser) {
                throw new Exception('Target user not found');
            }

            DB::table('users')
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
            if (!AdminManager::isSuperAdmin($userId)) {
                throw new Exception('Access denied: Super admin required');
            }

            $settings = DB::table('settings')
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
            if (!AdminManager::isSuperAdmin($userId)) {
                throw new Exception('Access denied: Super admin required');
            }

            $limit = min((int)($input['limit'] ?? 50), 200);
            $entityType = $input['entity_type'] ?? null;
            $targetUserId = isset($input['user_id']) ? (int)$input['user_id'] : null;

            $logs = \BotSawer\AuditLogger::getLogs($entityType, null, $targetUserId, $limit);

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

            $oldSetting = DB::table('settings')
                ->where('key', $key)
                ->first();

            DB::table('settings')
                ->where('key', $key)
                ->update([
                    'value' => $value,
                    'updated_at' => \Carbon\Carbon::now()
                ]);

                // Audit log setting change with full context
                \BotSawer\AuditLogger::logAdminAction('update_setting', [
                    'setting_key' => $key,
                    'old_value' => $oldSetting ? $oldSetting->value : null,
                    'new_value' => $value,
                    'setting_description' => $oldSetting ? $oldSetting->description : 'Unknown',
                    'admin_role' => $admin->role,
                    'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
                ], $userId);

            $response = ['message' => 'Setting updated successfully'];
            break;

        case 'get_bots':
            $bots = DB::table('bots')
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

            $botId = DB::table('bots')->insertGetId([
                'name' => $name,
                'username' => $username,
                'token' => $token,
                'webhook_secret' => $webhookSecret,
                'is_active' => 1,
                'created_at' => \Carbon\Carbon::now()
            ]);

            // Audit log
            \BotSawer\AuditLogger::logAdminAction('add_bot', [
                'bot_id' => $botId,
                'bot_name' => $name,
                'bot_username' => $username
            ], $userId);

            $response = ['message' => 'Bot added successfully', 'bot_id' => $botId];
            break;

        case 'toggle_bot':
            $botId = (int)($input['bot_id'] ?? 0);
            $active = (bool)($input['active'] ?? false);

            if (!$botId) {
                throw new Exception('Bot ID required');
            }

            DB::table('bots')
                ->where('id', $botId)
                ->update(['is_active' => $active ? 1 : 0]);

            // Audit log
            \BotSawer\AuditLogger::logAdminAction('toggle_bot_status', [
                'bot_id' => $botId,
                'active' => $active
            ], $userId);

            $response = ['message' => 'Bot status updated'];
            break;

        case 'approve_payment':
            if (!\BotSawer\AdminManager::canHandleFinance($userId)) {
                throw new Exception('Access denied: Finance admin required');
            }

            $proofId = (int)($input['proof_id'] ?? 0);
            $this->approvePayment($proofId, $userId, $admin);
            $response = ['message' => 'Payment approved successfully'];
            break;

        case 'reject_payment':
            if (!\BotSawer\AdminManager::canHandleFinance($userId)) {
                throw new Exception('Access denied: Finance admin required');
            }

            $proofId = (int)($input['proof_id'] ?? 0);
            $reason = $input['reason'] ?? 'Rejected by admin';
            $this->rejectPayment($proofId, $reason, $userId, $admin);
            $response = ['message' => 'Payment rejected successfully'];
            break;

        case 'get_pending_payments':
            if (!\BotSawer\AdminManager::canHandleFinance($userId)) {
                throw new Exception('Access denied: Finance admin required');
            }

            $payments = DB::table('payment_proofs')
                ->join('users', 'payment_proofs.user_id', '=', 'users.id')
                ->where('payment_proofs.status', 'pending')
                ->select('payment_proofs.*', 'users.first_name', 'users.last_name', 'users.username')
                ->orderBy('payment_proofs.created_at', 'desc')
                ->get()
                ->toArray();

            $response = array_map(function($payment) {
                return [
                    'id' => $payment->id,
                    'user_id' => $payment->user_id,
                    'user_name' => trim(($payment->first_name ?? '') . ' ' . ($payment->last_name ?? '')),
                    'username' => $payment->username,
                    'amount' => (float)$payment->amount,
                    'created_at' => $payment->created_at,
                    'has_file' => !empty($payment->telegram_file_id)
                ];
            }, $payments);
            break;

        case 'get_pending_payments':
            // Check finance permission
            if (!AdminManager::canHandleFinance($user->telegram_id)) {
                throw new Exception('Insufficient permissions');
            }

            $topups = DB::table('payment_proofs as pp')
                ->join('users as u', 'pp.user_id', '=', 'u.id')
                ->where('pp.status', 'pending')
                ->select('pp.*', 'u.first_name', 'u.last_name', 'u.username')
                ->orderBy('pp.created_at', 'asc')
                ->get()
                ->map(function ($item) {
                    // Get bot token for file URL (assuming first active bot)
                    $bot = DB::table('bots')->where('is_active', 1)->first();
                    $fileUrl = null;
                    if ($bot) {
                        // For now, we'll use a placeholder. In production, you'd need to get file path from Telegram API
                        $fileUrl = "https://api.telegram.org/file/bot{$bot->token}/{$item->telegram_file_id}";
                    }

                    return [
                        'id' => $item->id,
                        'type' => 'topup',
                        'amount' => (int)$item->amount,
                        'user_name' => trim(($item->first_name ?? '') . ' ' . ($item->last_name ?? '')),
                        'username' => $item->username,
                        'notes' => $item->note,
                        'proof_file_id' => $item->telegram_file_id,
                        'proof_url' => $fileUrl,
                        'created_at' => $item->created_at
                    ];
                });

            $withdrawals = DB::table('withdrawals as w')
                ->join('users as u', 'w.creator_id', '=', 'u.id')
                ->where('w.status', 'pending')
                ->select('w.*', 'u.first_name', 'u.last_name', 'u.username')
                ->orderBy('w.created_at', 'asc')
                ->get()
                ->map(function ($item) {
                    $bankDetails = json_decode($item->bank_details, true);
                    return [
                        'id' => $item->id,
                        'type' => 'withdraw',
                        'amount' => (int)$item->amount,
                        'original_amount' => (int)$item->original_amount,
                        'commission_rate' => (float)$item->commission_rate,
                        'commission_amount' => (int)$item->commission_amount,
                        'user_name' => trim(($item->first_name ?? '') . ' ' . ($item->last_name ?? '')),
                        'username' => $item->username,
                        'bank_name' => $bankDetails['bank_name'] ?? '',
                        'bank_account' => $bankDetails['account_number'] ?? '',
                        'account_name' => $bankDetails['account_name'] ?? '',
                        'created_at' => $item->created_at
                    ];
                });

            $response = array_merge($topups->toArray(), $withdrawals->toArray());
            break;

        case 'approve_payment':
            if (!AdminManager::canHandleFinance($user->telegram_id)) {
                throw new Exception('Insufficient permissions');
            }

            if (!isset($input['payment_id']) || !isset($input['payment_type'])) {
                throw new Exception('Missing parameters');
            }

            Database::transaction(function () use ($input, $userId) {
                if ($input['payment_type'] === 'topup') {
                    // Approve topup
                    $payment = DB::table('payment_proofs')
                        ->where('id', $input['payment_id'])
                        ->where('status', 'pending')
                        ->first();

                    if (!$payment) {
                        throw new Exception('Payment not found or already processed');
                    }

                    // Update payment status
                    DB::table('payment_proofs')
                        ->where('id', $input['payment_id'])
                        ->update([
                            'status' => 'approved',
                            'approved_by' => $userId,
                            
                        ]);

                    // Add balance to user
                    Wallet::addBalance($payment->user_id, $payment->amount, 'Topup approved by admin');

                    // Audit log
                    \BotSawer\AuditLogger::logAdminAction('approve_topup', [
                        'payment_id' => $input['payment_id'],
                        'user_id' => $payment->user_id,
                        'amount' => $payment->amount
                    ], $userId);

                } elseif ($input['payment_type'] === 'withdraw') {
                    // Approve withdrawal
                    $withdrawal = DB::table('withdrawals')
                        ->where('id', $input['payment_id'])
                        ->where('status', 'pending')
                        ->first();

                    if (!$withdrawal) {
                        throw new Exception('Withdrawal not found or already processed');
                    }

                    // Check if user has sufficient balance
                    $wallet = Wallet::getBalance($withdrawal->user_id);
                    if ($wallet < $withdrawal->amount) {
                        throw new Exception('Insufficient balance');
                    }

                    // Update withdrawal status
                    DB::table('withdrawals')
                        ->where('id', $input['payment_id'])
                        ->update([
                            'status' => 'approved',
                            'approved_by' => $userId,

                        ]);

                    // Update transaction status
                    DB::table('transactions')
                        ->where('id', $withdrawal->transaction_id)
                        ->update(['status' => 'success']);

                    // Note: Balance already deducted when withdrawal requested

                    // Record transaction
                    DB::table('transactions')->insert([
                        'user_id' => $withdrawal->user_id,
                        'type' => 'withdraw',
                        'amount' => $withdrawal->amount,
                        'status' => 'success',
                        'description' => 'Withdrawal (Admin approved)',
                        'from_user_id' => $userId
                    ]);

                    // Audit log
                    \BotSawer\AuditLogger::logAdminAction('approve_withdrawal', [
                        'withdrawal_id' => $input['payment_id'],
                        'user_id' => $withdrawal->user_id,
                        'amount' => $withdrawal->amount
                    ], $userId);
                }
            });

            $response = ['message' => 'Payment approved successfully'];
            break;

        case 'reject_payment':
            if (!AdminManager::canHandleFinance($user->telegram_id)) {
                throw new Exception('Insufficient permissions');
            }

            if (!isset($input['payment_id']) || !isset($input['payment_type'])) {
                throw new Exception('Missing parameters');
            }

            Database::transaction(function () use ($input, $userId) {
                $reason = $input['reason'] ?? 'Rejected by admin';

                if ($input['payment_type'] === 'topup') {
                    $payment = DB::table('payment_proofs')
                        ->where('id', $input['payment_id'])
                        ->where('status', 'pending')
                        ->first();

                    if (!$payment) {
                        throw new Exception('Payment not found');
                    }

                    DB::table('payment_proofs')
                        ->where('id', $input['payment_id'])
                        ->update([
                            'status' => 'rejected',
                            'notes' => $reason,
                            'approved_by' => $userId,

                        ]);

                    \BotSawer\AuditLogger::logAdminAction('reject_topup', [
                        'payment_id' => $input['payment_id'],
                        'user_id' => $payment->user_id,
                        'reason' => $reason
                    ], $userId);

                } elseif ($input['payment_type'] === 'withdraw') {
                    $withdrawal = DB::table('withdrawals')
                        ->where('id', $input['payment_id'])
                        ->where('status', 'pending')
                        ->first();

                    if (!$withdrawal) {
                        throw new Exception('Withdrawal not found');
                    }

                    DB::table('withdrawals')
                        ->where('id', $input['payment_id'])
                        ->update([
                            'status' => 'rejected',
                            'notes' => $reason,
                            'approved_by' => $userId,
                            
                        ]);

                    \BotSawer\AuditLogger::logAdminAction('reject_withdrawal', [
                        'withdrawal_id' => $input['payment_id'],
                        'user_id' => $withdrawal->user_id,
                        'reason' => $reason
                    ], $userId);
                }
            });

            $response = ['message' => 'Payment rejected successfully'];
            break;

        case 'get_pending_content':
            if (!AdminManager::canModerate($userId)) {
                throw new Exception('Access denied: Moderator admin required');
            }

            $content = DB::table('media as m')
                ->join('users as u', 'm.user_id', '=', 'u.id')
                ->join('creators as c', 'c.user_id', '=', 'u.id')
                ->where('m.status', 'pending')
                ->select('m.*', 'u.first_name', 'u.last_name', 'u.username', 'c.display_name')
                ->orderBy('m.created_at', 'asc')
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'file_type' => $item->file_type,
                        'file_size' => $item->file_size,
                        'caption' => $item->caption,
                        'creator_name' => $item->display_name ?: trim(($item->first_name ?? '') . ' ' . ($item->last_name ?? '')),
                        'creator_username' => $item->username,
                        'created_at' => $item->created_at,
                        'status' => 'pending'
                    ];
                });

            $response = $content->toArray();
            break;

        case 'get_approved_content':
            if (!AdminManager::canModerate($user->telegram_id)) {
                throw new Exception('Insufficient permissions');
            }

            $content = DB::table('media as m')
                ->join('users as u', 'm.user_id', '=', 'u.id')
                ->join('creators as c', 'c.user_id', '=', 'u.id')
                ->where('m.status', 'approved')
                ->whereNull('m.posted_at') // Not yet posted
                ->select('m.*', 'u.first_name', 'u.last_name', 'u.username', 'c.display_name')
                ->orderBy('m.created_at', 'asc')
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'file_type' => $item->file_type,
                        'file_size' => $item->file_size,
                        'caption' => $item->caption,
                        'creator_name' => $item->display_name ?: trim(($item->first_name ?? '') . ' ' . ($item->last_name ?? '')),
                        'creator_username' => $item->username,
                        'created_at' => $item->created_at,
                        'status' => 'approved'
                    ];
                });

            $response = $content->toArray();
            break;

        case 'approve_content':
            if (!AdminManager::canModerate($user->telegram_id)) {
                throw new Exception('Insufficient permissions');
            }

            if (!isset($input['content_id'])) {
                throw new Exception('Missing content_id');
            }

            $content = DB::table('media_files')
                ->where('id', $input['content_id'])
                ->where('status', 'pending')
                ->first();

            if (!$content) {
                throw new Exception('Content not found or already processed');
            }

            DB::table('media_files')
                ->where('id', $input['content_id'])
                ->update([
                    'status' => 'approved',
                    'approved_by' => $userId,
                    
                ]);

            \BotSawer\AuditLogger::logAdminAction('approve_content', [
                'content_id' => $input['content_id'],
                'creator_id' => $content->user_id
            ], $userId);

            $response = ['message' => 'Content approved successfully'];
            break;

        case 'reject_content':
            if (!AdminManager::canModerate($user->telegram_id)) {
                throw new Exception('Insufficient permissions');
            }

            if (!isset($input['content_id'])) {
                throw new Exception('Missing content_id');
            }

            $reason = $input['reason'] ?? 'Rejected by moderator';

            $content = DB::table('media_files')
                ->where('id', $input['content_id'])
                ->where('status', 'pending')
                ->first();

            if (!$content) {
                throw new Exception('Content not found');
            }

            DB::table('media_files')
                ->where('id', $input['content_id'])
                ->update([
                    'status' => 'rejected',
                    'notes' => $reason,
                    'approved_by' => $userId,
                    
                ]);

            \BotSawer\AuditLogger::logAdminAction('reject_content', [
                'content_id' => $input['content_id'],
                'creator_id' => $content->user_id,
                'reason' => $reason
            ], $userId);

            $response = ['message' => 'Content rejected successfully'];
            break;

        case 'get_content_details':
            if (!AdminManager::canModerate($user->telegram_id)) {
                throw new Exception('Insufficient permissions');
            }

            if (!isset($input['content_id'])) {
                throw new Exception('Missing content_id');
            }

            $content = DB::table('media_files')
                ->where('id', $input['content_id'])
                ->first();

            if (!$content) {
                throw new Exception('Content not found');
            }

            $response = [
                'id' => $content->id,
                'file_type' => $content->file_type,
                'file_url' => $content->file_path, // Assuming file_path contains URL
                'caption' => $content->caption,
                'status' => $content->status
            ];
            break;

        case 'post_content_to_channel':
            if (!AdminManager::canModerate($user->telegram_id)) {
                throw new Exception('Insufficient permissions');
            }

            if (!isset($input['content_id'])) {
                throw new Exception('Missing content_id');
            }

            $content = DB::table('media_files')
                ->where('id', $input['content_id'])
                ->where('status', 'approved')
                ->first();

            if (!$content) {
                throw new Exception('Content not found or not approved');
            }

            // Get bot configuration for posting
            $botConfig = DB::table('bot_configs')
                ->where('is_active', 1)
                ->first();

            if (!$botConfig || !$botConfig->channel_id) {
                throw new Exception('Bot configuration not found or channel not set');
            }

            // Use Bot class to post content
            $bot = new Bot($botConfig->id);
            $bot->postApprovedContentToChannel($content->id, $botConfig->channel_id);

            // Update content status to posted
            DB::table('media_files')
                ->where('id', $input['content_id'])
                ->update([
                    'status' => 'posted',
                    'posted_at' => \Carbon\Carbon::now(),
                    'posted_by' => $userId
                ]);

            \BotSawer\AuditLogger::logAdminAction('post_content_to_channel', [
                'content_id' => $input['content_id'],
                'channel_id' => $botConfig->channel_id,
                'creator_id' => $content->user_id
            ], $userId);

            $response = ['message' => 'Content posted to channel successfully'];
            break;

        case 'get_creators':
            if (!AdminManager::canModerate($user->telegram_id)) {
                throw new Exception('Insufficient permissions');
            }

            $creators = DB::table('creators as c')
                ->join('users as u', 'c.user_id', '=', 'u.id')
                ->leftJoin('media as m', 'm.user_id', '=', 'u.id')
                ->select(
                    'c.*',
                    'u.first_name',
                    'u.last_name',
                    'u.username',
                    \Illuminate\Database\Capsule\Manager::raw('COUNT(m.id) as total_content'),
                    \Illuminate\Database\Capsule\Manager::raw('COALESCE(SUM(m.total_donations), 0) as total_earnings')
                )
                ->groupBy('c.id', 'u.id', 'u.first_name', 'u.last_name', 'u.username')
                ->orderBy('c.created_at', 'desc')
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'user_id' => $item->user_id,
                        'display_name' => $item->display_name,
                        'user_name' => trim(($item->first_name ?? '') . ' ' . ($item->last_name ?? '')),
                        'username' => $item->username,
                        'is_verified' => (bool)$item->is_verified,
                        'total_content' => (int)$item->total_content,
                        'total_earnings' => (int)$item->total_earnings,
                        'created_at' => $item->created_at
                    ];
                });

            $response = $creators->toArray();
            break;

        case 'verify_creator':
            if (!AdminManager::canModerate($user->telegram_id)) {
                throw new Exception('Insufficient permissions');
            }

            if (!isset($input['creator_id'])) {
                throw new Exception('Missing creator_id');
            }

            DB::table('creators')
                ->where('id', $input['creator_id'])
                ->update([
                    'is_verified' => 1,
                    'verified_by' => $userId,
                    'verified_at' => \Carbon\Carbon::now()
                ]);

            $creator = DB::table('creators')
                ->where('id', $input['creator_id'])
                ->first();

            \BotSawer\AuditLogger::logAdminAction('verify_creator', [
                'creator_id' => $input['creator_id'],
                'user_id' => $creator->user_id
            ], $userId);

            $response = ['message' => 'Creator verified successfully'];
            break;

        case 'get_creator_profile':
            if (!AdminManager::canModerate($user->telegram_id)) {
                throw new Exception('Insufficient permissions');
            }

            if (!isset($input['creator_id'])) {
                throw new Exception('Missing creator_id');
            }

            $profile = DB::table('creators as c')
                ->join('users as u', 'c.user_id', '=', 'u.id')
                ->leftJoin('media as m', 'm.user_id', '=', 'u.id')
                ->where('c.id', $input['creator_id'])
                ->select(
                    'c.*',
                    'u.first_name',
                    'u.last_name',
                    'u.username',
                    \Illuminate\Database\Capsule\Manager::raw('COUNT(m.id) as total_content'),
                    \Illuminate\Database\Capsule\Manager::raw('COALESCE(SUM(m.total_donations), 0) as total_earnings')
                )
                ->first();

            if (!$profile) {
                throw new Exception('Creator not found');
            }

            $response = [
                'id' => $profile->id,
                'display_name' => $profile->display_name ?: trim(($profile->first_name ?? '') . ' ' . ($profile->last_name ?? '')),
                'bio' => $profile->bio,
                'bank_account' => $profile->bank_account,
                'total_content' => (int)$profile->total_content,
                'total_earnings' => (int)$profile->total_earnings,
                'is_verified' => (bool)$profile->is_verified
            ];
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