<?php

declare(strict_types=1);

namespace BotSawer;

use Telegram\Bot\Api;
use Telegram\Bot\Objects\Update;
use Exception;

// Moderator Bot Webhook - Hanya untuk admin
// Endpoint: https://yourdomain.com/public/moderator.php?secret=moderator_secret

try {
    // Load environment and initialize database
    require_once __DIR__ . '/../vendor/autoload.php';
    Database::init();

    // Start session for rate limiting
    session_start();

    // Get the raw POST data
    $input = file_get_contents('php://input');
    $update = json_decode($input, true);

    if (!$update) {
        Logger::warning('Invalid moderator webhook data received');
        http_response_code(400);
        exit('Invalid data');
    }

    // Convert to Update object
    $updateObject = new Update($update);

    // Verify this is moderator bot (special secret)
    $webhookSecret = $_GET['secret'] ?? '';
    $expectedSecret = 'moderator_' . gmdate('Y-m-d'); // Daily rotating secret (UTC to avoid timezone issues)

    if ($webhookSecret !== $expectedSecret) {
        Logger::warning('Invalid moderator webhook secret', [
            'provided' => $webhookSecret,
            'expected' => $expectedSecret
        ]);
        http_response_code(403);
        exit('Unauthorized');
    }

    // Get moderator bot (first active bot or specific moderator bot)
    $moderatorBotId = \Illuminate\Database\Capsule\Manager::table('bots')
        ->where('is_active', 1)
        ->orderBy('id', 'asc')
        ->value('id') ?: 1;

    // Initialize moderator bot
    $moderatorBot = new ModeratorBot($moderatorBotId);

    // Handle the update
    $moderatorBot->handleUpdate($updateObject);

    Logger::info('Moderator webhook processed successfully', [
        'update_id' => $updateObject->getUpdateId(),
        'bot_id' => $moderatorBotId
    ]);

} catch (Exception $e) {
    Logger::error('Moderator webhook processing failed', [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    http_response_code(500);
    exit('Internal server error');
}