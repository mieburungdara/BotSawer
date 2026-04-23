<?php

declare(strict_types=1);

namespace BotSawer;

use Exception;
use Illuminate\Database\Capsule\Manager as DB;
use Carbon\Carbon;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

require_once __DIR__ . '/../../../vendor/autoload.php';
Database::init();

try {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!$input) {
        throw new Exception('Invalid request');
    }

    $action = $input['action'] ?? 'get';
    $userId = WebAppAuth::authenticate($input);

    if ($action === 'get') {
        if (empty($input['short_id'])) {
            throw new Exception('short_id required');
        }

        $shortId = $input['short_id'];
        $media = DB::table('media_files')
            ->where('short_id', $shortId)
            ->where('status', '!=', 'deleted')
            ->first();

        if (!$media) {
            throw new Exception('Konten tidak ditemukan');
        }

        $isOwner = ((int)$media->user_id === (int)$userId);

        // Draft Security: Non-owners cannot see drafts
        if ($media->status === 'draft' && !$isOwner) {
            throw new Exception('Konten ini belum dipublikasikan oleh kreator');
        }

        $creator = DB::table('users')
            ->where('id', $media->user_id)
            ->first();

        $responseData = [
            'is_owner' => $isOwner,
            'short_id' => $media->short_id,
            'file_type' => $media->file_type,
            'status' => $media->status,
            'caption' => $media->caption,
            'created_at' => $media->created_at,
            'creator_id' => $creator->uuid ?: 'Anonim'
        ];

        if ($isOwner) {
            $responseData['total_donations'] = (float)($media->total_donations ?? 0);
            $responseData['donation_count'] = (int)($media->donation_count ?? 0);
        }

        echo json_encode(['success' => true, 'data' => $responseData]);
        exit;
    }

    if ($action === 'cancel_queue') {
        $shortId = $input['short_id'] ?? '';
        
        $media = DB::table('media_files')
            ->where('short_id', $shortId)
            ->where('user_id', $userId)
            ->first();

        if (!$media || $media->status !== 'queued') {
            throw new Exception('Hanya konten dalam antrean yang bisa dibatalkan');
        }

        DB::table('media_files')->where('id', $media->id)->update([
            'status' => 'draft',
            'updated_at' => Carbon::now()
        ]);

        echo json_encode(['success' => true, 'data' => ['message' => 'Konten dikembalikan ke Draft']]);
        exit;
    }

    if ($action === 'delete_content') {
        $shortId = $input['short_id'] ?? '';
        
        $media = DB::table('media_files')
            ->where('short_id', $shortId)
            ->where('user_id', $userId)
            ->first();

        if (!$media) {
            throw new Exception('Konten tidak ditemukan');
        }

        // Soft delete
        DB::table('media_files')->where('id', $media->id)->update([
            'status' => 'deleted',
            'updated_at' => Carbon::now()
        ]);

        echo json_encode(['success' => true, 'data' => ['message' => 'Konten berhasil dihapus']]);
        exit;
    }

    if ($action === 'donate') {
        $shortId = $input['short_id'] ?? '';
        $amount = (float)($input['amount'] ?? 0);
        $message = trim($input['message'] ?? '');

        if ($amount < 1000) {
            throw new Exception('Minimal donasi adalah Rp 1.000');
        }

        $media = DB::table('media_files')
            ->where('short_id', $shortId)
            ->where('status', '!=', 'deleted')
            ->first();

        if (!$media || $media->status === 'draft') {
            throw new Exception('Konten ini tidak tersedia untuk donasi');
        }

        if ((int)$media->user_id === $userId) {
            throw new Exception('Anda tidak bisa berdonasi ke konten sendiri');
        }

        Database::transaction(function() use ($userId, $media, $amount, $message) {
            // 1. Deduct from donor
            $donorWallet = DB::table('wallets')->where('user_id', $userId)->lockForUpdate()->first();
            if (!$donorWallet || $donorWallet->balance < $amount) {
                throw new Exception('Saldo Anda tidak mencukupi. Silakan topup terlebih dahulu.');
            }

            DB::table('wallets')->where('user_id', $userId)->decrement('balance', $amount);
            
            // 2. Add to creator
            DB::table('wallets')->where('user_id', $media->user_id)->increment('balance', $amount);

            // 3. Update media stats
            DB::table('media_files')->where('id', $media->id)->update([
                'total_donations' => DB::raw("total_donations + $amount"),
                'donation_count' => DB::raw("donation_count + 1")
            ]);

            // 4. Create Transactions
            DB::table('transactions')->insert([
                [
                    'user_id' => $userId,
                    'type' => 'donation',
                    'amount' => -$amount,
                    'status' => 'success',
                    'description' => "Donasi untuk konten #{$media->short_id}",
                    'media_id' => $media->id,
                    'created_at' => Carbon::now()
                ],
                [
                    'user_id' => $media->user_id,
                    'type' => 'donation_received',
                    'amount' => $amount,
                    'status' => 'success',
                    'description' => "Donasi diterima dari WebApp (#{$media->short_id})",
                    'media_id' => $media->id,
                    'created_at' => Carbon::now()
                ]
            ]);
        });

        echo json_encode(['success' => true, 'data' => ['message' => 'Terima kasih! Donasi berhasil dikirim.']]);
        exit;
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
