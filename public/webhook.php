<?php

declare(strict_types=1);

namespace BotSawer;

use Telegram\Bot\Api;
use Telegram\Bot\Objects\Update;
use Exception;

// Webhook handler for Telegram Bot
// Endpoint: https://boxanon.my.id/saweria/public/webhook.php

try {
    // Load environment and initialize database
    require_once __DIR__ . '/../vendor/autoload.php';
    Database::init();

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

    // Route based on webhook type
    $webhookSecret = $_GET['secret'] ?? '';

    if (strpos($webhookSecret, 'moderator_') === 0) {
        // This is moderator bot - redirect to moderator handler
        Logger::info('Redirecting to moderator bot handler');
        require_once __DIR__ . '/moderator.php';
        exit;
    }

    // Regular user bot
    $botId = 1; // Default bot
    if ($webhookSecret) {
        $botData = \Illuminate\Database\Capsule\Manager::table('bots')
            ->where('webhook_secret', $webhookSecret)
            ->where('is_active', 1)
            ->first();
        if ($botData) {
            $botId = $botData->id;
        }
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