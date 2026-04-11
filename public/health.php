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
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['HTTP_X_API_KEY'] ?? '';
    if (strpos($authHeader, 'Bearer ') === 0) {
        $authKey = substr($authHeader, 7);
    } elseif (strpos($authHeader, 'Token ') === 0) {
        $authKey = substr($authHeader, 6);
    } else {
        $authKey = $_GET['key'] ?? ''; // Fallback for backward compatibility
    }
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
        'timestamp' => \Carbon\Carbon::now()->toISOString(),
        'version' => '1.0.0',
        'metrics' => [
            'database' => 'connected',
            'total_users' => DB::table('users')->count(),
            'total_creators' => DB::table('creators')->where('is_verified', 1)->count(),
            'total_media' => DB::table('media_files')->count(),
            'total_transactions' => DB::table('transactions')->count(),
            'pending_withdrawals' => DB::table('withdrawals')->where('status', 'pending')->count(),
            'pending_topups' => DB::table('payment_proofs')->where('status', 'pending')->count(),
        ]
    ];

    // Check maintenance mode
    $maintenanceMode = DB::table('settings')
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
        'timestamp' => \Carbon\Carbon::now()->toISOString()
    ]);
}