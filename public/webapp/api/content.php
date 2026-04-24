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
            'creator_id' => $creator->uuid ?: 'Anonim',
            'imagekit_url' => $media->imagekit_url,
            'has_thumbnail_source' => ($media->file_type === 'photo' && !empty($media->telegram_file_id)) || !empty($media->thumb_file_id)
        ];

        // Apply blur for non-owners if imagekit_url exists
        if (!$isOwner && $responseData['imagekit_url']) {
            // Check if there are already query params
            $separator = strpos($responseData['imagekit_url'], '?') !== false ? '&' : '?';
            $responseData['imagekit_url'] .= $separator . 'tr=bl-30';
        }

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

    if ($action === 'generate_thumbnail') {
        $shortId = $input['short_id'] ?? '';
        $botId = $input['botId'] ?? null;

        if (!$botId) {
            throw new Exception('Bot ID tidak ditemukan');
        }

        $media = DB::table('media_files')
            ->where('short_id', $shortId)
            ->where('user_id', $userId)
            ->first();

        if (!$media) {
            throw new Exception('Konten tidak ditemukan atau Anda bukan pemiliknya');
        }

        if ($media->imagekit_url) {
            throw new Exception('Thumbnail sudah di-generate');
        }

        $fileIdToFetch = ($media->file_type === 'photo') ? $media->telegram_file_id : $media->thumb_file_id;

        if (!$fileIdToFetch) {
            throw new Exception('File ini tidak memiliki thumbnail yang bisa di-upload');
        }

        // Get Bot Token
        $bot = DB::table('bots')->where('id', $botId)->first();
        if (!$bot) {
            throw new Exception('Bot tidak valid');
        }

        // Get File Path from Telegram
        $tgApiUrl = "https://api.telegram.org/bot{$bot->token}/getFile?file_id={$fileIdToFetch}";
        $tgResponse = file_get_contents($tgApiUrl);
        $tgData = json_decode($tgResponse, true);

        if (!$tgData || !$tgData['ok']) {
            throw new Exception('Gagal mendapatkan file dari Telegram: ' . ($tgData['description'] ?? 'Unknown error'));
        }

        $filePath = $tgData['result']['file_path'];
        $directUrl = "https://api.telegram.org/file/bot{$bot->token}/{$filePath}";

        // Upload to ImageKit
        $uploadResult = ImageKitManager::uploadFromUrl($directUrl, "{$media->short_id}_thumb");

        // Save to DB
        DB::table('media_files')->where('id', $media->id)->update([
            'imagekit_file_id' => $uploadResult['fileId'],
            'imagekit_url' => $uploadResult['url']
        ]);

        echo json_encode(['success' => true, 'data' => [
            'message' => 'Thumbnail berhasil dibuat',
            'imagekit_url' => $uploadResult['url']
        ]]);
        exit;
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
