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

    $levels = [
        'donatur' => [
            'category' => 'Dermawan',
            'description' => 'Banyaknya saweran yang kamu kirim',
            'icon' => 'heart',
            'tiers' => [
                ['label' => 'Bronze', 'value' => 1, 'id' => 'donatur_1'],
                ['label' => 'Silver', 'value' => 10, 'id' => 'donatur_2'],
                ['label' => 'Gold', 'value' => 50, 'id' => 'donatur_3'],
                ['label' => 'Platinum', 'value' => 100, 'id' => 'donatur_4']
            ],
            'current' => $totalDonationsSent
        ],
        'sultan' => [
            'category' => 'Sultan',
            'description' => 'Total Rupiah yang kamu sawerkan',
            'icon' => 'coins',
            'tiers' => [
                ['label' => 'Bronze', 'value' => 10000, 'id' => 'sultan_1'],
                ['label' => 'Silver', 'value' => 100000, 'id' => 'sultan_2'],
                ['label' => 'Gold', 'value' => 1000000, 'id' => 'sultan_3'],
                ['label' => 'Platinum', 'value' => 10000000, 'id' => 'sultan_4']
            ],
            'current' => $totalAmountSent
        ],
        'kreator' => [
            'category' => 'Kreator',
            'description' => 'Banyaknya konten yang kamu posting',
            'icon' => 'image',
            'tiers' => [
                ['label' => 'Bronze', 'value' => 1, 'id' => 'kreator_1'],
                ['label' => 'Silver', 'value' => 10, 'id' => 'kreator_2'],
                ['label' => 'Gold', 'value' => 50, 'id' => 'kreator_3'],
                ['label' => 'Platinum', 'value' => 200, 'id' => 'kreator_4']
            ],
            'current' => $contentCount
        ],
        'earning' => [
            'category' => 'Golden Star',
            'description' => 'Total penghasilan dari saweran',
            'icon' => 'star',
            'tiers' => [
                ['label' => 'Bronze', 'value' => 100000, 'id' => 'earning_1'],
                ['label' => 'Silver', 'value' => 1000000, 'id' => 'earning_2'],
                ['label' => 'Gold', 'value' => 5000000, 'id' => 'earning_3'],
                ['label' => 'Platinum', 'value' => 25000000, 'id' => 'earning_4']
            ],
            'current' => $totalEarnings
        ]
    ];

    $processed = [];
    foreach ($levels as $key => $group) {
        $highestTier = null;
        $nextTier = null;
        
        foreach ($group['tiers'] as $tier) {
            if ($group['current'] >= $tier['value']) {
                $highestTier = $tier;
            } else {
                $nextTier = $tier;
                break;
            }
        }

        $progress = 0;
        if ($nextTier) {
            $prevValue = $highestTier ? $highestTier['value'] : 0;
            $range = $nextTier['value'] - $prevValue;
            $currentInRange = $group['current'] - $prevValue;
            $progress = min(100, max(0, ($currentInRange / $range) * 100));
        } else {
            $progress = 100;
        }

        $processed[] = [
            'id' => $key,
            'title' => $group['category'],
            'description' => $group['description'],
            'icon' => $group['icon'],
            'tier' => $highestTier ? $highestTier['label'] : 'Belum Ada',
            'next_tier' => $nextTier ? $nextTier['label'] : 'Maksimal',
            'target' => $nextTier ? $nextTier['value'] : $highestTier['value'],
            'current' => $group['current'],
            'progress' => $progress,
            'unlocked' => !is_null($highestTier)
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $processed
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
