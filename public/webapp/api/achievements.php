<?php

declare(strict_types=1);

namespace BotSawer;

use Exception;
use Illuminate\Database\Capsule\Manager as DB;

header('Content-Type: application/json');

require_once __DIR__ . '/../../../vendor/autoload.php';
Database::init();

session_start();

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) throw new Exception('Invalid request');

    $userId = WebAppAuth::authenticate($input);

    // Get user info
    $user = DB::table('users')->where('id', $userId)->first();
    $creator = DB::table('creators')->where('user_id', $userId)->first();

    // Calculate common metrics
    $totalDonationsSent = DB::table('transactions')
        ->where('from_user_id', $userId)
        ->where('type', 'donation')
        ->where('status', 'success')
        ->count();

    $totalAmountSent = DB::table('transactions')
        ->where('from_user_id', $userId)
        ->where('type', 'donation')
        ->where('status', 'success')
        ->sum('amount');

    $contentCount = $creator ? DB::table('media_files')->where('creator_id', $creator->id)->count() : 0;
    
    $totalEarnings = $creator ? DB::table('transactions')
        ->where('user_id', $userId)
        ->where('type', 'donation')
        ->where('status', 'success')
        ->sum('amount') : 0;

    $achievements = [
        [
            'id' => 'early_bird',
            'title' => 'Early Bird',
            'description' => 'Bergabung di masa awal peluncuran',
            'icon' => 'bird',
            'unlocked' => (int)$user->id <= 1000,
            'progress' => 100
        ],
        [
            'id' => 'first_blood',
            'title' => 'First Blood',
            'description' => 'Kirim saweran pertama kamu',
            'icon' => 'heart',
            'unlocked' => $totalDonationsSent >= 1,
            'progress' => min(100, $totalDonationsSent * 100)
        ],
        [
            'id' => 'generous_donor',
            'title' => 'Dermawan',
            'description' => 'Kirim 10 saweran ke kreator',
            'icon' => 'gift',
            'unlocked' => $totalDonationsSent >= 10,
            'progress' => min(100, ($totalDonationsSent / 10) * 100)
        ],
        [
            'id' => 'content_creator',
            'title' => 'Kreator Pemula',
            'description' => 'Posting konten pertama kamu',
            'icon' => 'image',
            'unlocked' => $contentCount >= 1,
            'progress' => min(100, $contentCount * 100)
        ],
        [
            'id' => 'rising_star',
            'title' => 'Rising Star',
            'description' => 'Dapatkan total saweran Rp 100.000',
            'icon' => 'star',
            'unlocked' => $totalEarnings >= 100000,
            'progress' => min(100, ($totalEarnings / 100000) * 100)
        ],
        [
            'id' => 'content_king',
            'title' => 'Raja Konten',
            'description' => 'Posting total 20 konten',
            'icon' => 'crown',
            'unlocked' => $contentCount >= 20,
            'progress' => min(100, ($contentCount / 20) * 100)
        ],
        [
            'id' => 'big_boss',
            'title' => 'Big Boss',
            'description' => 'Total saweran yang kamu kirim mencapai Rp 500.000',
            'icon' => 'coins',
            'unlocked' => $totalAmountSent >= 500000,
            'progress' => min(100, ($totalAmountSent / 500000) * 100)
        ]
    ];

    echo json_encode([
        'success' => true,
        'data' => $achievements
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
