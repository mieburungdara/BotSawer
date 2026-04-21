<?php

declare(strict_types=1);

namespace BotSawer;

use Exception;
use Throwable;
use Illuminate\Database\Capsule\Manager as DB;

// Start output buffering IMMEDIATELY to catch any PHP output
ob_start();

// Disable direct error output to browser
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
error_reporting(E_ALL);

// Load dependencies
require_once __DIR__ . '/../../../vendor/autoload.php';

// Set headers AFTER loading dependencies
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Register shutdown handler for fatal errors
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        ob_end_clean();
        
        // Try to log if logger is available
        if (class_exists('BotSawer\\Logger')) {
            Logger::critical('Fatal error in auth endpoint', [
                'message' => $error['message'],
                'file' => $error['file'],
                'line' => $error['line']
            ]);
        }
        
        echo json_encode([
            'success' => false,
            'message' => 'Internal server error'
        ]);
        exit;
    }
});

Database::init();

// Start session for rate limiting and auth state
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

    // Get bot ID for multi-bot support
    $telegramBotId = $input['botId'] ?? null;
    $dbBotId = 1; // Default

    if ($telegramBotId) {
        // Ensure telegramBotId is integer for DB query
        $telegramBotId = (int) $telegramBotId;

        // Find bot by telegram_id field - required for multi-bot
        $bot = DB::table('bots')
            ->where('telegram_id', $telegramBotId)
            ->where('is_active', 1)
            ->first();
        if ($bot) {
            $dbBotId = $bot->id;
        } else {
            Logger::error('Bot not found for telegram_id - access denied', ['telegram_bot_id' => $telegramBotId]);
            throw new Exception('Bot not recognized - please check your access');
        }
    }

    // Validate Telegram Web App data
    $userData = validateTelegramWebAppData($input['initData']);

    if (!$userData) {
        throw new Exception('Invalid Telegram authentication');
    }

    // Check if user exists (webapp accessed via bot, so users should already exist as creators)
    $user = DB::table('users')
        ->where('telegram_id', (string)$userData['id'])
        ->first();

    if (!$user) {
        throw new Exception('Akun tidak ditemukan. Silakan mulai bot terlebih dahulu dengan perintah /start');
    }

    // Update user info if changed (name, username from Telegram)
    $needsUpdate = false;
    $updateData = [];

    if (($user->first_name ?? '') !== ($userData['first_name'] ?? '')) {
        $updateData['first_name'] = $userData['first_name'] ?? null;
        $needsUpdate = true;
    }
    if (($user->last_name ?? '') !== ($userData['last_name'] ?? '')) {
        $updateData['last_name'] = $userData['last_name'] ?? null;
        $needsUpdate = true;
    }
    if (($user->username ?? '') !== ($userData['username'] ?? '')) {
        $updateData['username'] = $userData['username'] ?? null;
        $needsUpdate = true;
    }

    if ($needsUpdate) {
        try {
            $updateResult = DB::table('users')
                ->where('id', $user->id)
                ->update($updateData);
            if ($updateResult) {
                // Update local user object
                $user = (object)array_merge((array)$user, $updateData);

                // Also update creator display_name if name changed
                $newDisplayName = trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? ''));
                if (!empty($newDisplayName)) {
                    try {
                        $creatorUpdate = DB::table('creators')
                            ->where('user_id', $user->id)
                            ->update(['display_name' => $newDisplayName]);
                        if ($creatorUpdate) {
                        Logger::info('Creator display_name synced', [
                            'user_id' => $user->id,
                            'new_display_name' => $newDisplayName
                        ]);
                        }
                    } catch (Exception $e) {
                        Logger::warning('Failed to sync creator display_name', [
                            'user_id' => $user->id,
                            'error' => $e->getMessage()
                        ]);
                    }
                }

                Logger::info('User profile synced', ['user_id' => $user->id, 'updates' => $updateData]);
            }
        } catch (Exception $e) {
            Logger::warning('Failed to sync user profile', [
                'user_id' => $user->id,
                'updates' => $updateData,
                'error' => $e->getMessage()
            ]);
            // Continue with old data
        }
    }

    // Check if admin for this specific bot
    $isAdmin = DB::table('admins')
        ->where('telegram_id', $userData['id'])
        ->where('is_active', 1)
        ->exists(); // Global admin for now, can be scoped per bot later

    $adminData = null;
    $adminRole = null;

    if ($isAdmin) {
        $adminData = DB::table('admins')
            ->where('telegram_id', $userData['id'])
            ->first();
        $adminRole = $adminData->role ?? null;
    }

    // Check if creator (webapp users from bot should all be verified creators)
    $isCreator = (bool) DB::table('creators')
        ->where('user_id', $user->id)
        ->where('is_verified', 1)
        ->exists();

    // Store user_id in session for subsequent API calls
    $_SESSION['user_id'] = $user->id;

    // Log for monitoring
    Logger::info('Webapp authentication successful', [
        'user_id' => $user->id,
        'telegram_id' => $user->telegram_id,
        'is_admin' => $isAdmin,
        'admin_role' => $adminRole,
        'is_creator' => $isCreator
    ]);

    // Final response - use 'data' key to match frontend apiCall pattern
    $response = [
        'success' => true,
        'data' => [
            'id' => $user->id,
            'telegram_id' => $user->telegram_id,
            'first_name' => $userData['first_name'] ?? '',
            'last_name' => $userData['last_name'] ?? '',
            'username' => $userData['username'] ?? '',
            'is_admin' => $isAdmin,
            'admin_role' => $adminRole,
            'is_creator' => $isCreator,
            'language_code' => $userData['language_code'] ?? 'id'
        ],
        'timestamp' => \Carbon\Carbon::now()->toISOString()
    ];

    Logger::debug('Webapp auth response prepared', ['user_id' => $user->id]);
    echo json_encode($response);

} catch (Exception $e) {
    Logger::error('WebApp auth failed', [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString(),
        'remote_ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ]);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage(),
        'timestamp' => \Carbon\Carbon::now()->toISOString()
    ]);
}

/**
 * Validate Telegram WebApp initData and extract user information.
 *
 * @param string $initData The raw initData string from Telegram WebApp.
 * @returns array|null Parsed user data or null if validation fails.
 */
function validateTelegramWebAppData(string $initData): ?array
{
    if (empty($initData)) {
        return null;
    }

    // Parse init data
    parse_str($initData, $data);

    if (!isset($data['user']) || !isset($data['auth_date'])) {
        return null;
    }

    $user = json_decode($data['user'], true);
    if (!$user || !isset($user['id']) || !is_numeric($user['id'])) {
        return null;
    }

    // Check auth_date not too old (within 24 hours)
    $authDate = (int)($data['auth_date'] ?? 0);
    if (time() - $authDate > 86400) { // 24 hours
        return null;
    }

    // TODO: Verify hash with bot token for production security
    // For now, basic validation only
    return $user;
}