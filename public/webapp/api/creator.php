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

    $action = $input['action'] ?? 'get';

    // Verify user is a verified creator
    $creator = DB::table('creators')
        ->where('user_id', $userId)
        ->where('is_verified', 1)
        ->first();

    if (!$creator) {
        throw new Exception('Unauthorized: Not a verified creator');
    }

    // Ensure proper data types
    $creator->id = (int)$creator->id;
    $creator->user_id = (int)$creator->user_id;
    $creator->is_verified = (bool)$creator->is_verified;

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
        $formattedBankAccount = $bankAccount;
        if (!empty($bankAccount)) {
            $formattedBankAccount = validateAndFormatBankAccount($bankAccount);
        }

        DB::table('creators')
            ->where('id', $creator->id)
            ->update([
                'display_name' => $displayName,
                'bio' => $bio,
                'bank_account' => $formattedBankAccount,
                'updated_at' => \Carbon\Carbon::now()
            ]);

        // Audit log - creator updating own profile
        \BotSawer\AuditLogger::logCreatorAction('update_profile', $creator->id, [
            'display_name' => $displayName,
            'bio' => $bio,
            'bank_account' => !empty($bankAccount) ? '***UPDATED***' : ''
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Profil berhasil diperbarui'
        ]);
        exit;
    }

    if ($action === 'save_goal') {
        $title = trim($input['title'] ?? '');
        $targetAmount = (float)($input['targetAmount'] ?? 0);

        if (empty($title)) {
            throw new Exception('Judul target tidak boleh kosong');
        }

        if ($targetAmount < 1000) {
            throw new Exception('Minimal target adalah Rp 1.000');
        }

        $success = Creator::saveGoal($creator->id, $title, $targetAmount);

        echo json_encode([
            'success' => $success,
            'message' => $success ? 'Target donasi berhasil disimpan' : 'Gagal menyimpan target'
        ]);
        exit;
    }

    if ($action === 'delete_goal') {
        $goalId = (int)($input['goalId'] ?? 0);
        if ($goalId <= 0) {
            throw new Exception('Invalid Goal ID');
        }

        $success = Creator::deleteGoal($creator->id, $goalId);

        echo json_encode([
            'success' => $success,
            'message' => $success ? 'Target donasi berhasil dibatalkan' : 'Gagal membatalkan target'
        ]);
        exit;
    }

    // Default: Get creator dashboard data
    $stats = Creator::getStats($creator->id);

    // Pagination
    $page = (int)($input['page'] ?? 1);
    $limit = (int)($input['limit'] ?? 10);
    $offset = ($page - 1) * $limit;

    // Get total content count for pagination
    $totalContent = DB::table('media_files')
        ->where('media_files.creator_id', $creator->id)
        ->count();

    // Get paginated recent content
    $recentContent = DB::table('media_files')
        ->select('media_files.*')
        ->selectRaw('COALESCE(SUM(transactions.amount), 0) as total_donations')
        ->selectRaw('COUNT(transactions.id) as donation_count')
        ->leftJoin('transactions', function($join) {
            $join->on('media_files.id', '=', 'transactions.media_id')
                 ->where('transactions.type', '=', 'donation')
                 ->where('transactions.status', '=', 'success');
        })
        ->where('media_files.creator_id', $creator->id)
        ->groupBy('media_files.id')
        ->orderBy('media_files.created_at', 'desc')
        ->offset($offset)
        ->limit($limit)
        ->get()
        ->toArray();

    // Get top content by donations (remains limited to top 10 for dashboard context)
    $topContent = DB::table('media_files')
        ->select('media_files.*')
        ->selectRaw('COALESCE(SUM(transactions.amount), 0) as total_donations')
        ->selectRaw('COUNT(transactions.id) as donation_count')
        ->leftJoin('transactions', function($join) {
            $join->on('media_files.id', '=', 'transactions.media_id')
                 ->where('transactions.type', '=', 'donation')
                 ->where('transactions.status', '=', 'success');
        })
        ->where('media_files.creator_id', $creator->id)
        ->groupBy('media_files.id')
        ->orderByRaw('COALESCE(SUM(transactions.amount), 0) DESC')
        ->limit(10)
        ->get()
        ->toArray();

    // Get recent donations with messages
    $recentDonations = DB::table('transactions')
        ->join('users', 'transactions.from_user_id', '=', 'users.id')
        ->where('transactions.user_id', $userId) // Target creator
        ->where('transactions.type', 'donation')
        ->where('transactions.status', 'success')
        ->select('transactions.amount', 'transactions.description as message', 'transactions.created_at', 'users.first_name', 'users.last_name', 'users.username')
        ->orderBy('transactions.created_at', 'desc')
        ->limit(5)
        ->get()
        ->toArray();

    // Get analytics data for charts
    $analytics = [
        'donations_last_7_days' => getDonationsLast7Days($userId),
        'donations_by_amount' => getDonationsByAmount($userId),
        'top_content_chart' => array_slice($topContent, 0, 5),
        'recent_donations' => $recentDonations
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
            'active_goal' => $stats['active_goal'] ?? null,
            'recent_content' => $recentContent,
            'top_content' => $topContent,
            'analytics' => $analytics,
            'pagination' => [
                'total_items' => $totalContent,
                'total_pages' => ceil($totalContent / $limit),
                'current_page' => $page,
                'limit' => $limit
            ]
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
    if (!in_array($bankNameUpper, $supportedBanks) && strpos($bankNameUpper, 'LAINNYA') === false) {
        throw new Exception('Nama bank tidak didukung. Gunakan salah satu: ' . implode(', ', $supportedBanks));
    }

    // Validate account number (must be numeric, 10-20 digits)
    if (!preg_match('/^\d{10,20}$/', $accountNumber)) {
        throw new Exception('Nomor rekening harus berupa angka 10-20 digit');
    }

    // Validate account holder name (must be alphabetic with common punctuation, 3-50 chars)
    if (!preg_match('/^[a-zA-Z\s\'\-\.]{3,50}$/', $accountHolder)) {
        throw new Exception('Nama pemilik rekening harus berupa huruf, spasi, apostrof, strip, atau titik (3-50 karakter)');
    }

    // Return formatted bank account
    return strtoupper($bankName) . ' - ' . $accountNumber . ' - ' . ucwords(strtolower($accountHolder));
}

function getDonationsLast7Days(int $creatorId): array
{
    $now = \Carbon\Carbon::now();
    $startDate = $now->copy()->subDays(6)->toDateString();
    $endDate = $now->toDateString();

    // Single query with group by date
    $results = DB::table('transactions')
        ->where('user_id', $creatorId)
        ->where('type', 'donation')
        ->where('status', 'success')
        ->whereBetween('created_at', [$startDate . ' 00:00:00', $endDate . ' 23:59:59'])
        ->selectRaw('DATE(created_at) as date, SUM(amount) as amount')
        ->groupByRaw('DATE(created_at)')
        ->orderByRaw('DATE(created_at)')
        ->pluck('amount', 'date')
        ->toArray();

    $data = [];
    for ($i = 6; $i >= 0; $i--) {
        $date = $now->copy()->subDays($i)->toDateString();
        $amount = isset($results[$date]) ? (int)$results[$date] : 0;
        $data[] = [
            'date' => $date,
            'amount' => $amount
        ];
    }
    return $data;
}

function getDonationsByAmount(int $creatorId): array
{
    // Single query with conditional aggregation
    $result = DB::table('transactions')
        ->where('user_id', $creatorId)
        ->where('type', 'donation')
        ->where('status', 'success')
        ->selectRaw("
            SUM(CASE WHEN amount BETWEEN 100 AND 499 THEN 1 ELSE 0 END) as range_100,
            SUM(CASE WHEN amount BETWEEN 500 AND 999 THEN 1 ELSE 0 END) as range_500,
            SUM(CASE WHEN amount BETWEEN 1000 AND 1999 THEN 1 ELSE 0 END) as range_1000,
            SUM(CASE WHEN amount BETWEEN 2000 AND 4999 THEN 1 ELSE 0 END) as range_2000,
            SUM(CASE WHEN amount >= 5000 THEN 1 ELSE 0 END) as range_5000_plus
        ")
        ->first();

    return [
        ['range' => '100', 'count' => (int)$result->range_100],
        ['range' => '500', 'count' => (int)$result->range_500],
        ['range' => '1000', 'count' => (int)$result->range_1000],
        ['range' => '2000', 'count' => (int)$result->range_2000],
        ['range' => '5000+', 'count' => (int)$result->range_5000_plus]
    ];
}