<?php

declare(strict_types=1);

namespace BotSawer;

use Exception;
use Illuminate\Database\Capsule\Manager as DB;

header('Content-Type: application/json');

require_once __DIR__ . '/../../../vendor/autoload.php';
Database::init();

try {
    $settings = DB::table('settings')->get()->pluck('value', 'key')->toArray();
    
    // Only return public settings
    $publicSettings = [
        'app_name' => $settings['app_name'] ?? 'Vesper',
        'app_version' => $settings['app_version'] ?? '1.0.0',
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
