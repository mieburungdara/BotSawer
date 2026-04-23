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

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) throw new Exception('Invalid request');

    // Optional authentication, list can be public
    try {
        WebAppAuth::authenticate($input);
    } catch (Exception $e) {
        // Continue anyway if public list
    }

    $bots = DB::table('bots')->where('is_active', 1)->where('type', 'public')->get();
    $channels = DB::table('channels')->where('is_active', 1)->get();
    $groups = DB::table('groups')->where('is_active', 1)->get();

    echo json_encode([
        'success' => true,
        'data' => [
            'bots' => $bots,
            'channels' => $channels,
            'groups' => $groups
        ]
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
