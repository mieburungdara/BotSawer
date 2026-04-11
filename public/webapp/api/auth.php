<?php

declare(strict_types=1);

namespace BotSawer;

use Exception;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Load dependencies
require_once __DIR__ . '/../../vendor/autoload.php';
Database::init();

// Start session for rate limiting
session_start();

// Rate limiting
$endpoint = basename(__FILE__);
$userId = $_SERVER['REMOTE_ADDR']; // Use IP for auth endpoint

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
    // Get POST data
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || !isset($input['initData'])) {
        throw new Exception('Invalid request data');
    }

    // Validate Telegram Web App data
    $userData = validateTelegramWebAppData($input['initData']);

    if (!$userData) {
        throw new Exception('Invalid Telegram authentication');
    }

    // Check if user exists
    $user = \Illuminate\Database\Capsule\Manager::table('users')
        ->where('telegram_id', $userData['id'])
        ->first();

    if (!$user) {
        // Create user if doesn't exist
        $userId = \Illuminate\Database\Capsule\Manager::table('users')->insertGetId([
            'telegram_id' => $userData['id'],
            'first_name' => $userData['first_name'] ?? null,
            'last_name' => $userData['last_name'] ?? null,
            'username' => $userData['username'] ?? null,
            'language_code' => $userData['language_code'] ?? 'id',
            'is_banned' => 0
        ]);
        $user = (object)['id' => $userId, 'telegram_id' => $userData['id'], 'is_creator' => 0];
    }

    // Check if admin using AdminManager
    $isAdmin = AdminManager::isAdmin($userData['id']);
    $adminData = null;
    $adminRole = null;

    if ($isAdmin) {
        $adminData = AdminManager::getAdmin($userData['id']);
        $adminRole = $adminData->role;
    }

    // Check if creator
    $isCreator = (bool) \Illuminate\Database\Capsule\Manager::table('creators')
        ->where('user_id', $user->id)
        ->where('is_verified', 1)
        ->exists();

    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user->id,
            'first_name' => $userData['first_name'] ?? '',
            'last_name' => $userData['last_name'] ?? '',
            'username' => $userData['username'] ?? '',
            'is_admin' => $isAdmin,
            'admin_role' => $adminRole,
            'is_creator' => $isCreator
        ]
    ]);

} catch (Exception $e) {
    Logger::error('WebApp auth failed', ['error' => $e->getMessage()]);
    echo json_encode([
        'success' => false,
        'message' => 'Authentication failed'
    ]);
}

function validateTelegramWebAppData(string $initData): ?array
{
    // Parse init data
    parse_str($initData, $data);

    if (!isset($data['user'])) {
        return null;
    }

    $user = json_decode($data['user'], true);
    if (!$user || !isset($user['id'])) {
        return null;
    }

    // Basic validation - in production, verify hash with bot token
    return $user;
}