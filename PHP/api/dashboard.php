<?php

declare(strict_types=1);

namespace VesperApp;

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

    $userId = WebAppAuth::authenticate($input);

    // Get active announcements
    $announcements = DB::table('announcements')
        ->where('is_active', 1)
        ->orderBy('created_at', 'desc')
        ->limit(3)
        ->get();

    // Get user stats for dashboard
    $wallet = DB::table('wallets')->where('user_id', $userId)->first();
    $stats = [
        'balance' => $wallet ? (int)$wallet->balance : 0,
        'total_donations' => DB::table('transactions')
            ->where('user_id', $userId)
            ->where('type', 'donation')
            ->where('status', 'success')
            ->sum('amount'),
        'active_contents' => DB::table('media_files')
            ->where('user_id', $userId)
            ->count()
    ];

    echo json_encode([
        'success' => true,
        'data' => [
            'announcements' => $announcements,
            'stats' => $stats
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

