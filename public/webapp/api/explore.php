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

// Rate limiting
$endpoint = basename(__FILE__);
$userId = $_SERVER['REMOTE_ADDR'];

if (!RateLimiter::check($endpoint, $userId)) {
    http_response_code(429);
    echo json_encode([
        'success' => false,
        'message' => 'Terlalu banyak request. Coba lagi nanti.'
    ]);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        throw new Exception('Invalid request');
    }

    // Authenticate via Telegram initData
    $viewerId = WebAppAuth::authenticate($input);

    $action = $input['action'] ?? 'search';

    if ($action === 'search') {
        $query = trim($input['query'] ?? '');
        $limit = (int)($input['limit'] ?? 20);
        
        $creators = Creator::searchCreators($query, $limit);
        
        // Enrich with stats
        $enrichedCreators = array_map(function($c) {
            $c->total_media = Creator::getMediaCount((int)$c->id);
            return $c;
        }, $creators);

        echo json_encode([
            'success' => true,
            'data' => $enrichedCreators
        ]);
        exit;
    }

    if ($action === 'get_profile') {
        $targetUserId = (int)($input['userId'] ?? 0);
        if ($targetUserId <= 0) $targetUserId = $viewerId;

        $user = DB::table('users')->where('id', $targetUserId)->first();
        if (!$user) {
            throw new Exception('User tidak ditemukan');
        }

        $creator = DB::table('creators')->where('user_id', $targetUserId)->first();
        
        $stats = [];
        if ($creator) {
            $stats = Creator::getStats((int)$creator->id);
            $stats['is_creator'] = true;
        } else {
            // General user stats
            $stats['is_creator'] = false;
            $stats['total_donations_sent'] = DB::table('transactions')
                ->where('from_user_id', $targetUserId)
                ->where('type', 'donation')
                ->where('status', 'success')
                ->count();
            $stats['total_amount_sent'] = DB::table('transactions')
                ->where('from_user_id', $targetUserId)
                ->where('type', 'donation')
                ->where('status', 'success')
                ->sum('amount');
        }

        $recentActivity = DB::table('transactions')
            ->where(function($q) use ($targetUserId) {
                $q->where('user_id', $targetUserId)
                  ->orWhere('from_user_id', $targetUserId);
            })
            ->where('type', 'donation')
            ->where('status', 'success')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        echo json_encode([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->first_name . ' ' . $user->last_name,
                    'username' => $user->username,
                    'joined_at' => $user->created_at
                ],
                'creator' => $creator ? [
                    'display_name' => $creator->display_name,
                    'bio' => $creator->bio,
                    'is_verified' => (bool)$creator->is_verified,
                    'is_private' => (bool)$user->is_private
                ] : null,
                'stats' => $stats,
                'activity' => $recentActivity
            ]
        ]);
        exit;
    }

    if ($action === 'get_top') {
        $limit = (int)($input['limit'] ?? 10);
        $creators = Creator::getAllCreators($limit);
        
        echo json_encode([
            'success' => true,
            'data' => $creators
        ]);
        exit;
    }

    throw new Exception('Invalid action');

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
