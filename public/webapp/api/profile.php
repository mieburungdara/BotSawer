<?php

declare(strict_types=1);

namespace BotSawer;

use Exception;
use Illuminate\Database\Capsule\Manager as DB;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

require_once __DIR__ . '/../../../vendor/autoload.php';
Database::init();

// Start session for rate limiting
session_start();

// Rate limiting
$endpoint = basename(__FILE__);
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

    if (!$input) {
        throw new Exception('Invalid request');
    }

    // Authenticate via Telegram initData
    $userId = WebAppAuth::authenticate($input);

    // Get user data
    $user = DB::table('users')
        ->where('id', $userId)
        ->first();

    if (!$user) {
        throw new Exception('User tidak ditemukan');
    }

    // Get wallet balance
    $wallet = DB::table('wallets')
        ->where('user_id', $userId)
        ->first();

    // Check if admin
    $isAdmin = DB::table('admins')
        ->where('telegram_id', $user->telegram_id)
        ->where('is_active', 1)
        ->exists();

    // Check if creator (verified)
    $isCreator = (bool)$user->is_verified;
    
    // Badge logic: Check if actually posted content
    $hasPosted = false;
    if ($isCreator) {
        $hasPosted = DB::table('media_files')
            ->where('user_id', $user->id)
            ->exists();
    }

    // Badge logic: Check if actually donated
    $hasDonated = DB::table('transactions')
        ->where('from_user_id', $user->id)
        ->where('type', 'donation')
        ->where('status', 'success')
        ->exists();

    // Prepare response
    $response = [
        'id' => $user->id,
        'telegram_id' => $user->telegram_id,
        'name' => $user->display_name ?: trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: $user->username ?: 'User',
        'username' => $user->username,
        'photo_url' => $user->photo_url,
        'balance' => $wallet ? (int)$wallet->balance : 0,
        'is_banned' => (bool)$user->is_banned,
        'is_verified' => (bool)$user->is_verified,
        'is_admin' => $isAdmin,
        'is_creator' => $isCreator,
        'has_posted' => $hasPosted,
        'has_donated' => $hasDonated,
        'created_at' => $user->created_at
    ];

    echo json_encode([
        'success' => true,
        'data' => $response
    ]);

} catch (Exception $e) {
    Logger::logApiError('profile.php', $input, $e);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
