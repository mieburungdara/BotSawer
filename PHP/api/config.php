<?php

declare(strict_types=1);

namespace VesperApp;

use Exception;
use Illuminate\Database\Capsule\Manager as DB;

header('Content-Type: application/json');

require_once __DIR__ . '/../../../vendor/autoload.php';
Database::init();

try {
    $settings = DB::table('settings')->get()->pluck('value', 'key')->toArray();
    $input = json_decode(file_get_contents('php://input'), true);
    $botId = $input['botId'] ?? null;
    $botUsername = 'linkzipbot'; // Default fallback

    if ($botId) {
        $bot = DB::table('bots')->where('bot_id', $botId)->first();
        if ($bot) {
            $botUsername = $bot->username;
        }
    }

    // Only return public settings
    $publicSettings = [
        'app_name' => $settings['app_name'] ?? 'Vesper',
        'app_version' => $settings['app_version'] ?? '1.0.0',
        'bot_username' => $botUsername,
        'min_withdraw' => (int)($settings['min_withdraw'] ?? 50000),
        'platform_commission' => (int)($settings['platform_commission'] ?? 10)
    ];

    echo json_encode([
        'success' => true,
        'data' => $publicSettings
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}

