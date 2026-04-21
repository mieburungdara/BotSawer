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

    $contentCount = DB::table('media_files')->where('user_id', $userId)->count();
    
    $totalEarnings = DB::table('transactions')
        ->where('user_id', $userId)
        ->where('type', 'donation')
        ->where('status', 'success')
        ->sum('amount');

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

    $processedGroups = [];
    foreach ($levels as $key => $group) {
        $tiersWithStatus = [];
        foreach ($group['tiers'] as $tier) {
            $isUnlocked = $group['current'] >= $tier['value'];
            $tiersWithStatus[] = [
                'label' => $tier['label'],
                'value' => $tier['value'],
                'unlocked' => $isUnlocked
            ];
        }

        $processedGroups[] = [
            'id' => $key,
            'title' => $group['category'],
            'description' => $group['description'],
            'icon' => $group['icon'],
            'current' => $group['current'],
            'tiers' => $tiersWithStatus
        ];
    }

    $specialAchievements = [
        [
            'id' => 'early_bird',
            'title' => 'Early Bird',
            'description' => 'Salah satu dari 1.000 pengguna pertama',
            'icon' => 'bird',
            'unlocked' => (int)$user->id <= 1000,
            'type' => 'legacy'
        ]
    ];

    echo json_encode([
        'success' => true,
        'data' => [
            'categories' => $processedGroups,
            'special' => $specialAchievements
        ]
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
