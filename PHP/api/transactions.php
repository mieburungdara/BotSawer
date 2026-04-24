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

// Start session for rate limiting
session_start();

// Rate limiting
$endpoint = basename(__FILE__);
// Note: $input not defined yet, use REMOTE_ADDR for rate limiting
$userId = $_SERVER['REMOTE_ADDR'];

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
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        throw new Exception('Invalid request');
    }

    // Authenticate via Telegram initData
    $userId = WebAppAuth::authenticate($input);

    // Get recent transactions
    $transactions = DB::table('transactions')
        ->where('user_id', $userId)
        ->orderBy('created_at', 'desc')
        ->limit(20)
        ->get()
        ->map(function($tx) {
            return [
                'id' => $tx->id,
                'type' => $tx->type,
                'amount' => (int)$tx->amount,
                'description' => $tx->description ?? 'Transaksi',
                'status' => $tx->status,
                'created_at' => $tx->created_at
            ];
        });

    echo json_encode([
        'success' => true,
        'data' => $transactions
    ]);

} catch (Exception $e) {
    Logger::error('Transactions API error', ['error' => $e->getMessage()]);
    echo json_encode([
        'success' => false,
        'message' => 'Failed to load transactions'
    ]);
}
