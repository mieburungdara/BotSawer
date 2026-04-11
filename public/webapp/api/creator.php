<?php

declare(strict_types=1);

namespace BotSawer;

use Exception;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once __DIR__ . '/../../vendor/autoload.php';
Database::init();

// Start session for rate limiting
session_start();

// Rate limiting
$endpoint = basename(__FILE__);
$userId = $input['userId'] ?? $_SERVER['REMOTE_ADDR'];

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

    if (!$input || !isset($input['userId'])) {
        throw new Exception('Invalid request');
    }

    // Check session authentication
    if (!isset($_SESSION['user_id']) || $_SESSION['user_id'] != $input['userId']) {
        throw new Exception('Authentication required');
    }

    $userId = $input['userId'];
    $action = $input['action'] ?? 'get';

    // Verify user is a verified creator
    $creator = \Illuminate\Database\Capsule\Manager::table('creators')
        ->where('user_id', $userId)
        ->where('is_verified', 1)
        ->first();

    if (!$creator) {
        throw new Exception('Unauthorized: Not a verified creator');
    }

    if ($action === 'update_profile') {
        // Update creator profile
        $displayName = trim($input['displayName'] ?? '');
        $bio = trim($input['bio'] ?? '');
        $bankAccount = trim($input['bankAccount'] ?? '');

        if (empty($displayName)) {
            throw new Exception('Display name is required');
        }

        if (strlen($displayName) < 3 || strlen($displayName) > 50) {
            throw new Exception('Display name must be 3-50 characters');
        }

        if (!empty($bio) && strlen($bio) > 500) {
            throw new Exception('Bio must be less than 500 characters');
        }

        // Validate bank account format if provided
        if (!empty($bankAccount)) {
            $bankAccount = self::validateAndFormatBankAccount($bankAccount);
        }

        \Illuminate\Database\Capsule\Manager::table('creators')
            ->where('id', $creator->id)
            ->update([
                'display_name' => $displayName,
                'bio' => $bio,
                'bank_account' => $bankAccount,
                'updated_at' => \Carbon\Carbon::now()
            ]);

        // Audit log
        \BotSawer\AuditLogger::log(\BotSawer\AuditLogger::ACTION_UPDATE, 'creator', $creator->id, [], [
            'display_name' => $displayName,
            'bio' => $bio,
            'bank_account' => !empty($bankAccount) ? '***UPDATED***' : ''
        ], $userId);

        echo json_encode([
            'success' => true,
            'message' => 'Profil berhasil diperbarui'
        ]);
        exit;
    }

    // Default: Get creator dashboard data
    $stats = Creator::getStats($userId);

    // Get recent content
    $recentContent = \Illuminate\Database\Capsule\Manager::table('media_files')
        ->select('media_files.*')
        ->selectRaw('COALESCE(SUM(transactions.amount), 0) as total_donations')
        ->selectRaw('COUNT(transactions.id) as donation_count')
        ->leftJoin('transactions', function($join) {
            $join->on('media_files.id', '=', 'transactions.media_id')
                 ->where('transactions.type', '=', 'donation')
                 ->where('transactions.status', '=', 'success');
        })
        ->where('media_files.creator_id', $userId)
        ->groupBy('media_files.id')
        ->orderBy('media_files.created_at', 'desc')
        ->limit(10)
        ->get()
        ->toArray();

    // Get top content by donations
    $topContent = \Illuminate\Database\Capsule\Manager::table('media_files')
        ->select('media_files.*')
        ->selectRaw('COALESCE(SUM(transactions.amount), 0) as total_donations')
        ->selectRaw('COUNT(transactions.id) as donation_count')
        ->leftJoin('transactions', function($join) {
            $join->on('media_files.id', '=', 'transactions.media_id')
                 ->where('transactions.type', '=', 'donation')
                 ->where('transactions.status', '=', 'success');
        })
        ->where('media_files.creator_id', $userId)
        ->groupBy('media_files.id')
        ->orderByRaw('COALESCE(SUM(transactions.amount), 0) DESC')
        ->limit(10)
        ->get()
        ->toArray();

    // Get analytics data for charts
    $analytics = [
        'donations_last_7_days' => self::getDonationsLast7Days($userId),
        'donations_by_amount' => self::getDonationsByAmount($userId),
        'top_content_chart' => array_slice($topContent, 0, 5)
    ];

    echo json_encode([
        'success' => true,
        'data' => [
            'profile' => [
                'display_name' => $creator->display_name,
                'bio' => $creator->bio,
                'bank_account' => $creator->bank_account
            ],
            'stats' => $stats,
            'recent_content' => $recentContent,
            'top_content' => $topContent,
            'analytics' => $analytics
        ]
    ]);

} catch (Exception $e) {
    Logger::error('Creator API error', ['error' => $e->getMessage()]);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

function validateAndFormatBankAccount(string $bankAccount): string
{
    // Expected format: "BANK_NAME - ACCOUNT_NUMBER - ACCOUNT_HOLDER"
    $parts = explode('-', $bankAccount);

    if (count($parts) !== 3) {
        throw new Exception('Format rekening bank harus: NAMA_BANK - NOMOR_REKENING - NAMA_PEMILIK');
    }

    $bankName = trim($parts[0]);
    $accountNumber = trim($parts[1]);
    $accountHolder = trim($parts[2]);

    // Validate bank name (must be one of supported banks)
    $supportedBanks = [
        'BCA', 'MANDIRI', 'BRI', 'BNI', 'CIMB', 'DANAMON', 'PERMATA', 'BSI',
        'OCBC', 'MAYBANK', 'PANIN', 'MEGA', 'BUKOPIN', 'SAHABAT SAMPOERNA'
    ];

    $bankNameUpper = strtoupper($bankName);
    if (!in_array($bankNameUpper, $supportedBanks) && !str_contains($bankNameUpper, 'LAINNYA')) {
        throw new Exception('Nama bank tidak didukung. Gunakan salah satu: ' . implode(', ', $supportedBanks));
    }

    // Validate account number (must be numeric, 10-20 digits)
    if (!preg_match('/^\d{10,20}$/', $accountNumber)) {
        throw new Exception('Nomor rekening harus berupa angka 10-20 digit');
    }

    // Validate account holder name (must be alphabetic, 3-50 chars)
    if (!preg_match('/^[a-zA-Z\s]{3,50}$/', $accountHolder)) {
        throw new Exception('Nama pemilik rekening harus berupa huruf 3-50 karakter');
    }

    // Return formatted bank account
    return strtoupper($bankName) . ' - ' . $accountNumber . ' - ' . ucwords(strtolower($accountHolder));
}

function getDonationsLast7Days(int $creatorId): array
{
    $data = [];
    for ($i = 6; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-{$i} days"));
        $amount = \Illuminate\Database\Capsule\Manager::table('transactions')
            ->where('user_id', $creatorId)
            ->where('type', 'donation')
            ->where('status', 'success')
            ->whereDate('created_at', $date)
            ->sum('amount');

        $data[] = [
            'date' => $date,
            'amount' => (int)$amount
        ];
    }
    return $data;
}

function getDonationsByAmount(int $creatorId): array
{
    $amountRanges = [
        '100' => [100, 499],
        '500' => [500, 999],
        '1000' => [1000, 1999],
        '2000' => [2000, 4999],
        '5000+' => [5000, PHP_INT_MAX]
    ];

    $data = [];
    foreach ($amountRanges as $label => $range) {
        $count = \Illuminate\Database\Capsule\Manager::table('transactions')
            ->where('user_id', $creatorId)
            ->where('type', 'donation')
            ->where('status', 'success')
            ->whereBetween('amount', $range)
            ->count();

        $data[] = [
            'range' => $label,
            'count' => $count
        ];
    }
    return $data;
}