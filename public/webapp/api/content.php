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

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input || empty($input['short_id'])) {
        throw new Exception('Invalid request: short_id required');
    }

    $shortId = $input['short_id'];

    // Authenticate user
    $userId = WebAppAuth::authenticate($input);

    // Fetch media details
    $media = DB::table('media_files')
        ->where('short_id', $shortId)
        ->first();

    if (!$media) {
        throw new Exception('Konten tidak ditemukan');
    }

    $isOwner = ((int)$media->user_id === (int)$userId);

    // Draft Security Rule: Non-owners cannot access draft content
    if ($media->status === 'draft' && !$isOwner) {
        throw new Exception('Konten ini belum dipublikasikan oleh kreator');
    }

    if ($isOwner) {
        // Full data for owner
        $responseData = [
            'is_owner' => true,
            'id' => $media->id,
            'short_id' => $media->short_id,
            'file_type' => $media->file_type,
            'caption' => $media->caption,
            'status' => $media->status,
            'media_group_id' => $media->media_group_id,
            'created_at' => $media->created_at,
            'thumb_file_id' => $media->thumb_file_id
        ];
    } else {
        // Public data for others
        $creator = DB::table('users')
            ->where('id', $media->user_id)
            ->select('id', 'display_name', 'uuid', 'is_verified')
            ->first();

        // Get donation stats
        $stats = DB::table('transactions')
            ->where('media_id', $media->id)
            ->where('status', 'success')
            ->select(DB::raw('COUNT(*) as count'), DB::raw('SUM(amount) as total'))
            ->first();

        $responseData = [
            'is_owner' => false,
            'short_id' => $media->short_id,
            'file_type' => $media->file_type,
            'status' => $media->status,
            'creator' => $creator,
            'stats' => [
                'donation_count' => (int)($stats->count ?? 0),
                'total_amount' => (float)($stats->total ?? 0)
            ],
            'created_at' => $media->created_at
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $responseData
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
