<?php

declare(strict_types=1);

namespace BotSawer;

use Exception;
use Illuminate\Database\Capsule\Manager as DB;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once __DIR__ . '/../../../vendor/autoload.php';
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

    if (!$input || !isset($input['action'])) {
        throw new Exception('Invalid request');
    }

    // Authenticate via Telegram initData
    $userId = WebAppAuth::authenticate($input);

    $action = $input['action'];
    $botId = $input['botId'] ?? 1; // Default bot ID

    // Get user for admin check
    $user = DB::table('users')->where('id', $userId)->first();
    if (!$user) {
        throw new Exception('User not found');
    }

    $admin = DB::table('admins')
        ->where('telegram_id', $user->telegram_id)
        ->where('is_active', 1)
        ->first();

    if (!$admin) {
        throw new Exception('Authentication required');
    }
            if (!$admin) {
                throw new Exception('Admin data not found');
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
                ], $user->telegram_id);

            $response = ['message' => 'Setting updated successfully'];
            break;

        case 'get_bots':
            if (!AdminManager::isSuperAdmin($user->telegram_id)) {
                throw new Exception('Access denied: Super admin required');
            }

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
            if (!AdminManager::isSuperAdmin($user->telegram_id)) {
                throw new Exception('Access denied: Super admin required');
            }

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



        case 'get_payment_proof_url':
            if (!AdminManager::canHandleFinance($user->telegram_id)) {
                throw new Exception('Access denied: Finance admin required');
            }

            $proofId = (int)($input['proof_id'] ?? 0);
            if (!$proofId) {
                throw new Exception('Proof ID required');
            }

            $proof = DB::table('payment_proofs')->where('id', $proofId)->first();
            if (!$proof || !$proof->telegram_file_id) {
                throw new Exception('Payment proof not found or no file attached');
            }

            // Get bot token
            $bot = DB::table('bots')->where('id', $botId)->first();
            if (!$bot) {
                throw new Exception('Bot configuration not found');
            }

            // Get file path from Telegram
            $tgUrl = "https://api.telegram.org/bot{$bot->token}/getFile?file_id={$proof->telegram_file_id}";
            $tgResponse = @file_get_contents($tgUrl);
            if ($tgResponse === false) {
                 throw new Exception('Failed to connect to Telegram API');
            }
            $tgData = json_decode($tgResponse, true);

            if (!$tgData['ok']) {
                throw new Exception('Failed to get file from Telegram: ' . ($tgData['description'] ?? 'Unknown error'));
            }

            $filePath = $tgData['result']['file_path'];
            $finalUrl = "https://api.telegram.org/file/bot{$bot->token}/{$filePath}";

            $response = ['url' => $finalUrl];
            break;

        case 'get_pending_payments':
            if (!AdminManager::canHandleFinance($user->telegram_id)) {
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



        case 'approve_payment':
            if (!AdminManager::canHandleFinance($user->telegram_id)) {
                throw new Exception('Access denied: Finance admin required');
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

                    // Send Telegram Notification
                    \BotSawer\NotificationManager::notifyTopupApproved((int)$payment->user_id, (int)$payment->amount);

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
                    // No need for duplicate transaction

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
            if (!AdminManager::canModerate($user->telegram_id)) {
                throw new Exception('Access denied: Moderator admin required');
            }

            $content = DB::table('media_files as m')
                ->join('users as u', 'm.user_id', '=', 'u.id')
                ->join('creators as c', 'm.creator_id', '=', 'c.id')
                ->where('m.bot_id', $botId)
                ->where('m.status', 'queued')
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

            $content = DB::table('media_files as m')
                ->join('users as u', 'm.user_id', '=', 'u.id')
                ->join('creators as c', 'm.creator_id', '=', 'c.id')
                ->where('m.bot_id', $botId)
                ->where('m.status', 'scheduled')
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
                throw new Exception('Access denied: Moderator admin required');
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
                    'status' => 'scheduled',
                    'approved_by' => $userId
                ]);

            \BotSawer\AuditLogger::logAdminAction('approve_content', [
                'content_id' => $input['content_id'],
                'creator_id' => $content->user_id
            ], $userId);

            $response = ['message' => 'Content approved successfully'];
            break;

        case 'reject_content':
            if (!AdminManager::canModerate($user->telegram_id)) {
                throw new Exception('Access denied: Moderator admin required');
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
                throw new Exception('Access denied: Moderator admin required');
            }

            if (!isset($input['content_id'])) {
                throw new Exception('Missing content_id');
            }

            $content = DB::table('media_files')
                ->where('id', $input['content_id'])
                ->where('bot_id', $botId)
                ->where('status', 'pending')
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
                throw new Exception('Access denied: Moderator admin required');
            }

            if (!isset($input['content_id'])) {
                throw new Exception('Missing content_id');
            }

            $content = DB::table('media_files')
                ->where('id', $input['content_id'])
                ->where('bot_id', $botId)
                ->where('status', 'pending')
                ->first();

            if (!$content) {
                throw new Exception('Content not found or not approved');
            }

            // Get public channel from settings
            $publicChannel = DB::table('settings')
                ->where('key', 'public_channel')
                ->value('value');

            if (!$publicChannel) {
                throw new Exception('Public channel not configured');
            }

            // Get bot for posting (use first active bot)
            $botData = DB::table('bots')
                ->where('is_active', 1)
                ->first();

            if (!$botData) {
                throw new Exception('No active bot found');
            }

            // Use Bot class to post content
            $bot = new Bot($botData->id);
            $bot->postApprovedContentToChannel($content->id, $publicChannel);

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
            // Check admin permissions using DB
            $isAdmin = DB::table('admins')
                ->where('telegram_id', $user->telegram_id)
                ->where('is_active', 1)
                ->whereIn('role', ['super_admin', 'moderator', 'finance'])
                ->exists();
            if (!$isAdmin) {
                throw new Exception('Insufficient permissions');
            }

            $creators = DB::table('creators as c')
                ->join('users as u', 'c.user_id', '=', 'u.id')
                ->leftJoin('media_files as m', 'm.user_id', '=', 'u.id')
                ->leftJoin('transactions as t', function($join) {
                    $join->on('t.media_id', '=', 'm.id')
                         ->where('t.bot_id', '=', $botId)
                         ->where('t.type', '=', 'donation')
                         ->where('t.status', '=', 'success');
                })
                ->select(
                    'c.*',
                    'u.first_name',
                    'u.last_name',
                    'u.username',
                    DB::raw('COUNT(DISTINCT CASE WHEN m.bot_id = ? THEN m.id END) as total_content', [$botId]),
                    DB::raw('COALESCE(SUM(CASE WHEN m.bot_id = ? THEN t.amount END), 0) as total_earnings', [$botId])
                )
                ->where('c.is_verified', 1)
                ->groupBy('c.id', 'c.user_id', 'c.display_name', 'c.bio', 'c.bank_account', 'c.is_verified', 'c.created_at', 'u.id', 'u.first_name', 'u.last_name', 'u.username')
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
            // Check admin permissions using DB
            $isAdmin = DB::table('admins')
                ->where('telegram_id', $user->telegram_id)
                ->where('is_active', 1)
                ->whereIn('role', ['super_admin', 'moderator'])
                ->exists();
            if (!$isAdmin) {
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
                throw new Exception('Access denied: Moderator admin required');
            }

            if (!isset($input['creator_id'])) {
                throw new Exception('Missing creator_id');
            }

             $profile = DB::table('creators as c')
                ->join('users as u', 'c.user_id', '=', 'u.id')
                ->leftJoin('media_files as m', 'm.user_id', '=', 'u.id')
                ->leftJoin('transactions as t', function($join) {
                    $join->on('t.media_id', '=', 'm.id')
                         ->where('t.type', '=', 'donation')
                         ->where('t.status', '=', 'success');
                })
                ->where('c.id', $input['creator_id'])
                ->select(
                    'c.*',
                    'u.first_name',
                    'u.last_name',
                    'u.username',
                    DB::raw('COUNT(m.id) as total_content'),
                    DB::raw('COALESCE(SUM(t.amount), 0) as total_earnings')
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

        case 'get_admins':
            if (!AdminManager::isSuperAdmin($user->telegram_id)) {
                throw new Exception('Access denied: Super admin required');
            }

            $admins = DB::table('admins as a')
                ->join('users as u', 'a.telegram_id', '=', 'u.telegram_id')
                ->select(
                    'a.id',
                    'a.telegram_id',
                    'a.telegram_username',
                    'a.full_name',
                    'a.role',
                    'a.is_active',
                    'a.last_login',
                    'a.created_at',
                    'u.first_name',
                    'u.last_name'
                )
                ->orderBy('a.created_at', 'desc')
                ->get()
                ->toArray();

            $response = array_map(function($admin) {
                return [
                    'id' => $admin->id,
                    'telegram_id' => $admin->telegram_id,
                    'telegram_username' => $admin->telegram_username,
                    'full_name' => $admin->full_name ?: trim(($admin->first_name ?? '') . ' ' . ($admin->last_name ?? '')),
                    'role' => $admin->role,
                    'is_active' => (bool)$admin->is_active,
                    'last_login' => $admin->last_login,
                    'created_at' => $admin->created_at
                ];
            }, $admins);
            break;

        case 'add_admin':
            if (!AdminManager::isSuperAdmin($user->telegram_id)) {
                throw new Exception('Access denied: Super admin required');
            }

            $telegramId = (int)($input['telegram_id'] ?? 0);
            $username = trim($input['username'] ?? '');
            $fullName = trim($input['full_name'] ?? '');
            $role = $input['role'] ?? '';

            if (!$telegramId || !$username || !$fullName || !$role) {
                throw new Exception('All fields are required');
            }

            // Check if user exists
            $userExists = DB::table('users')->where('telegram_id', $telegramId)->exists();
            if (!$userExists) {
                throw new Exception('User not found in users table');
            }

            // Check if already an admin
            $existingAdmin = DB::table('admins')->where('telegram_id', $telegramId)->first();
            if ($existingAdmin) {
                throw new Exception('User is already an admin');
            }

            DB::table('admins')->insert([
                'telegram_id' => $telegramId,
                'telegram_username' => $username,
                'full_name' => $fullName,
                'role' => $role,
                'is_active' => 1,
                'created_by' => $userId,
                'created_at' => \Carbon\Carbon::now()
            ]);

            // Audit log
            \BotSawer\AuditLogger::logAdminAction('add_admin', [
                'new_admin_telegram_id' => $telegramId,
                'new_admin_username' => $username,
                'new_admin_role' => $role
            ], $userId);

            $response = ['message' => 'Admin added successfully'];
            break;

        case 'deactivate_admin':
            if (!AdminManager::isSuperAdmin($user->telegram_id)) {
                throw new Exception('Access denied: Super admin required');
            }

            $adminId = (int)($input['admin_id'] ?? 0);

            if (!$adminId) {
                throw new Exception('Admin ID required');
            }

            // Cannot deactivate yourself
            $currentAdmin = DB::table('admins')->where('telegram_id', $user->telegram_id)->first();
            if ($currentAdmin && $currentAdmin->id == $adminId) {
                throw new Exception('Cannot deactivate yourself');
            }

            DB::table('admins')
                ->where('id', $adminId)
                ->update(['is_active' => 0]);

            // Audit log
            \BotSawer\AuditLogger::logAdminAction('deactivate_admin', [
                'deactivated_admin_id' => $adminId
            ], $userId);

            $response = ['message' => 'Admin deactivated successfully'];
            break;
            if (!AdminManager::canModerate($user->telegram_id)) {
                throw new Exception('Access denied: Moderator admin required');
            }

            if (!isset($input['creator_id'])) {
                throw new Exception('Missing creator_id');
            }

             $profile = DB::table('creators as c')
                ->join('users as u', 'c.user_id', '=', 'u.id')
                ->leftJoin('media_files as m', 'm.user_id', '=', 'u.id')
                ->where('c.id', $input['creator_id'])
                ->select(
                    'c.*',
                    'u.first_name',
                    'u.last_name',
                    'u.username',
                    DB::raw('COUNT(m.id) as total_content'),
                    DB::raw('COALESCE(SUM(t.amount), 0) as total_earnings')
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