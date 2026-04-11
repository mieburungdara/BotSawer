<?php

declare(strict_types=1);

namespace BotSawer;

use Exception;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

require_once __DIR__ . '/../../vendor/autoload.php';

// Simple health check endpoint
// Returns system status and basic metrics

try {
    Database::init();

    // Simple auth check for health endpoint
    $authKey = $_GET['key'] ?? '';
    if ($authKey !== 'health_check_2026') {
        http_response_code(401);
        echo json_encode([
            'status' => 'unauthorized',
            'message' => 'Invalid access key'
        ]);
        exit;
    }

    $response = [
        'status' => 'healthy',
        'timestamp' => date('c'),
        'version' => '1.0.0',
        'metrics' => [
            'database' => 'connected',
            'total_users' => \Illuminate\Database\Capsule\Manager::table('users')->count(),
            'total_creators' => \Illuminate\Database\Capsule\Manager::table('creators')->where('is_verified', 1)->count(),
            'total_media' => \Illuminate\Database\Capsule\Manager::table('media_files')->count(),
            'total_transactions' => \Illuminate\Database\Capsule\Manager::table('transactions')->count(),
            'pending_withdrawals' => \Illuminate\Database\Capsule\Manager::table('withdrawals')->where('status', 'pending')->count(),
            'pending_topups' => \Illuminate\Database\Capsule\Manager::table('payment_proofs')->where('status', 'pending')->count(),
        ]
    ];

    // Check maintenance mode
    $maintenanceMode = \Illuminate\Database\Capsule\Manager::table('settings')
        ->where('key', 'maintenance_mode')
        ->value('value');

    if ($maintenanceMode === '1') {
        $response['status'] = 'maintenance';
        $response['message'] = 'System is under maintenance';
        http_response_code(503);
    }

    echo json_encode($response);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'unhealthy',
        'error' => 'Health check failed',
        'timestamp' => date('c')
    ]);
}