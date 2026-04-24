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

        $hasPosted = false;
        if ($user->is_verified) {
            $hasPosted = DB::table('media_files')
                ->where('user_id', $user->id)
                ->exists();
        }

        $hasDonated = DB::table('transactions')
            ->where('from_user_id', $targetUserId)
            ->where('type', 'donation')
            ->where('status', 'success')
            ->exists();

        // Unified stats: Everyone can have both creator and donor stats
        $stats = Creator::getStats((int)$user->id);
        $stats['is_creator'] = (bool)$user->is_verified;
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

        // Get user's posted media
        $mediaFiles = DB::table('media_files')
            ->where('user_id', $targetUserId)
            ->where('status', 'posted')
            ->select('id', 'file_type', 'caption', 'created_at', 'posted_at')
            ->orderBy('posted_at', 'desc')
            ->limit(20)
            ->get()
            ->map(function($m) {
                $donationCount = DB::table('transactions')
                    ->where('media_id', $m->id)
                    ->where('type', 'donation')
                    ->where('status', 'success')
                    ->count();
                $donationTotal = DB::table('transactions')
                    ->where('media_id', $m->id)
                    ->where('type', 'donation')
                    ->where('status', 'success')
                    ->sum('amount');
                return [
                    'id' => $m->id,
                    'file_type' => $m->file_type,
                    'caption' => $m->caption,
                    'posted_at' => $m->posted_at,
                    'donation_count' => (int)$donationCount,
                    'donation_total' => (int)$donationTotal,
                ];
            });

        echo json_encode([
            'success' => true,
            'data' => [
                'user' => [
                    'id' => $user->id,
                    'name' => $user->first_name . ' ' . $user->last_name,
                    'username' => $user->username,
                    'photo_url' => $user->photo_url ?? null,
                    'joined_at' => $user->created_at
                ],
                'creator' => [
                    'display_name' => $user->display_name,
                    'bio' => $user->bio,
                    'is_verified' => (bool)$user->is_verified,
                ],
                'badges' => [
                    'has_posted' => $hasPosted,
                    'has_donated' => $hasDonated
                ],
                'stats' => $stats,
                'activity' => $recentActivity,
                'media' => $mediaFiles
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

