<?php

declare(strict_types=1);

namespace BotSawer;

use Telegram\Bot\Api;
use Telegram\Bot\Objects\Update;
use Exception;
use Illuminate\Database\Capsule\Manager as DB;

// Webhook handler for Telegram Bot
// Endpoint: https://boxanon.my.id/saweria/public/webhook.php

try {
    // Load environment and initialize database
    require_once __DIR__ . '/../vendor/autoload.php';
    Database::init();

    // Start session for rate limiting
    session_start();

    // Rate limiting for webhook
    $endpoint = 'webhook';
    $userId = $_SERVER['REMOTE_ADDR']; // Use IP for rate limiting

    if (!RateLimiter::check($endpoint, $userId)) {
        http_response_code(429);
        Logger::warning('Webhook rate limit exceeded', ['ip' => $userId]);
        exit('Rate limit exceeded');
    }

    // Get the raw POST data
    $input = file_get_contents('php://input');
    $update = json_decode($input, true);

    if (!$update) {
        Logger::warning('Invalid webhook data received');
        http_response_code(400);
        exit('Invalid data');
    }

    // Convert to Update object
    $updateObject = new Update($update);

    // Debug: log full update data (disabled - uncomment if needed)
    // Logger::debug('WEBHOOK RECEIVED UPDATE', [
    //     'full_update' => json_encode($update),
    //     'update_type' => key($update),
    //     'has_message' => isset($update['message']),
    //     'has_callback' => isset($update['callback_query']),
    //     'message_from_id' => $update['message']['from']['id'] ?? null,
    //     'callback_from_id' => $update['callback_query']['from']['id'] ?? null,
    //     'ip_address' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    // ]);

    // Route based on bot ID
    $botId = $_GET['bot_id'] ?? null;
    
    if ($botId) {
        // Keep as string to avoid overflow
    } else {
        // Fallback ke bot aktif pertama jika tidak ada bot_id
        $botData = DB::table('bots')
            ->where('is_active', 1)
            ->orderBy('id', 'asc')
            ->first();
        $botId = $botData ? $botData->bot_id : 0;
    }

    // Initialize regular bot
    $bot = new Bot($botId);

    // Handle the update
    $bot->handleUpdate($updateObject);

    Logger::info('Webhook processed successfully', [
        'update_id' => $updateObject->getUpdateId(),
        'bot_id' => $botId
    ]);
} catch (Exception $e) {
    Logger::error('Webhook processing failed', [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    http_response_code(500);
    exit('Internal server error');
}