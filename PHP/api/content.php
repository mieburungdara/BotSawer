<?php

declare(strict_types=1);

require __DIR__ . '/../../../vendor/autoload.php';

use VesperApp\Database;
use VesperApp\WebAppAuth;
use VesperApp\ImageKitManager;
use Illuminate\Database\Capsule\Manager as DB;
use Carbon\Carbon;

header('Content-Type: application/json');

try {
    Database::init();

    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $userId = WebAppAuth::authenticate($input);

    $action = $input['action'] ?? '';

    if ($action === 'get') {
        if (!isset($input['short_id'])) {
            throw new Exception('short_id required');
        }

        $shortId = $input['short_id'];
        
        // Get Content parent
        $content = DB::table('contents')
            ->where('short_id', $shortId)
            ->where('status', '!=', 'deleted')
            ->first();

        if (!$content) {
            throw new Exception('Konten tidak ditemukan');
        }

        $isOwner = ((int)$content->user_id === (int)$userId);

        // Draft Security: Non-owners cannot see drafts
        if ($content->status === 'draft' && !$isOwner) {
            throw new Exception('Konten ini belum dipublikasikan oleh kreator');
        }

        $creator = DB::table('users')
            ->where('id', $content->user_id)
            ->first();

        // Get Media Files
        $mediaFiles = DB::table('media_files')
            ->where('content_id', $content->id)
            ->get();

        $mediaList = [];
        foreach ($mediaFiles as $media) {
            $hasThumbnailSource = ($media->file_type === 'photo' && !empty($media->telegram_file_id)) || !empty($media->thumb_file_id);
            
            $ikUrl = $media->imagekit_url;
            if ($ikUrl) {
                $transformations = [];
                if (!$isOwner) {
                    $transformations[] = ['blur' => '30'];
                }
                $ikUrl = ImageKitManager::signUrl($ikUrl, $transformations, 3600);
            }

            $mediaList[] = [
                'id' => $media->id,
                'file_type' => $media->file_type,
                'imagekit_url' => $ikUrl,
                'has_thumbnail_source' => $hasThumbnailSource
            ];
        }

        $responseData = [
            'is_owner' => $isOwner,
            'short_id' => $content->short_id,
            'status' => $content->status,
            'caption' => $content->caption,
            'created_at' => $content->created_at,
            'creator_id' => $creator->uuid ?: 'Anonim',
            'media_list' => $mediaList,
        ];

        if ($isOwner) {
            $responseData['total_donations'] = (float)($content->total_donations ?? 0);
            $responseData['donation_count'] = (int)($content->donation_count ?? 0);
        }

        echo json_encode(['success' => true, 'data' => $responseData]);
        exit;
    }

    if ($action === 'cancel_queue') {
        $shortId = $input['short_id'] ?? '';
        
        $content = DB::table('contents')
            ->where('short_id', $shortId)
            ->where('user_id', $userId)
            ->first();

        if (!$content || $content->status !== 'queued') {
            throw new Exception('Hanya konten dalam antrean yang bisa dibatalkan');
        }

        DB::table('contents')->where('id', $content->id)->update([
            'status' => 'draft',
            'updated_at' => Carbon::now()
        ]);

        echo json_encode(['success' => true, 'data' => ['message' => 'Konten dikembalikan ke Draft']]);
        exit;
    }

    if ($action === 'delete_content') {
        $shortId = $input['short_id'] ?? '';
        
        $content = DB::table('contents')
            ->where('short_id', $shortId)
            ->where('user_id', $userId)
            ->first();

        if (!$content) {
            throw new Exception('Konten tidak ditemukan');
        }

        // Soft delete on contents
        DB::table('contents')->where('id', $content->id)->update([
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

        $content = DB::table('contents')
            ->where('short_id', $shortId)
            ->where('status', '!=', 'deleted')
            ->first();

        if (!$content || $content->status === 'draft') {
            throw new Exception('Konten ini tidak tersedia untuk donasi');
        }

        if ((int)$content->user_id === $userId) {
            throw new Exception('Anda tidak bisa berdonasi ke konten sendiri');
        }

        Database::transaction(function() use ($userId, $content, $amount, $message) {
            // 1. Deduct from donor
            $donorWallet = DB::table('wallets')->where('user_id', $userId)->lockForUpdate()->first();
            if (!$donorWallet || $donorWallet->balance < $amount) {
                throw new Exception('Saldo Anda tidak mencukupi. Silakan topup terlebih dahulu.');
            }

            DB::table('wallets')->where('user_id', $userId)->decrement('balance', $amount);
            
            // 2. Add to creator
            DB::table('wallets')->where('user_id', $content->user_id)->increment('balance', $amount);

            // 3. Update contents stats
            DB::table('contents')->where('id', $content->id)->update([
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
                    'description' => "Donasi untuk konten #{$content->short_id}",
                    'media_id' => null, // Assuming media_id is nullable or can link to content_id instead
                    'created_at' => Carbon::now()
                ],
                [
                    'user_id' => $content->user_id,
                    'type' => 'donation_received',
                    'amount' => $amount,
                    'status' => 'success',
                    'description' => "Donasi diterima dari WebApp (#{$content->short_id})",
                    'media_id' => null,
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

        $content = DB::table('contents')
            ->where('short_id', $shortId)
            ->where('user_id', $userId)
            ->first();

        if (!$content) {
            throw new Exception('Konten tidak ditemukan atau Anda bukan pemiliknya');
        }

        $mediaFiles = DB::table('media_files')
            ->where('content_id', $content->id)
            ->whereNull('imagekit_url') // Only generate for those without it
            ->get();

        if ($mediaFiles->isEmpty()) {
            throw new Exception('Tidak ada thumbnail baru yang perlu di-generate atau fitur tidak didukung pada file-file ini.');
        }

        // Get Bot Token
        $bot = DB::table('bots')->where('bot_id', $botId)->first();
        if (!$bot) {
            throw new Exception('Bot tidak valid');
        }

        $successCount = 0;
        foreach ($mediaFiles as $media) {
            $fileIdToFetch = ($media->file_type === 'photo') ? $media->telegram_file_id : $media->thumb_file_id;

            if (!$fileIdToFetch) {
                continue; // Skip if no thumbnail source
            }

            // Get File Path from Telegram
            $tgApiUrl = "https://api.telegram.org/bot{$bot->token}/getFile?file_id={$fileIdToFetch}";
            $tgResponse = @file_get_contents($tgApiUrl);
            $tgData = json_decode($tgResponse, true);

            if ($tgData && $tgData['ok']) {
                $filePath = $tgData['result']['file_path'];
                $directUrl = "https://api.telegram.org/file/bot{$bot->token}/{$filePath}";

                // Upload to ImageKit
                $uploadResult = ImageKitManager::uploadFromUrl($directUrl, "{$content->short_id}_{$media->id}_thumb");

                // Save to DB
                DB::table('media_files')->where('id', $media->id)->update([
                    'imagekit_file_id' => $uploadResult['fileId'],
                    'imagekit_url' => $uploadResult['url'],
                    'updated_at' => Carbon::now()
                ]);
                
                $successCount++;
            }
        }

        if ($successCount === 0) {
            throw new Exception('Gagal meng-upload thumbnail (Mungkin file tidak didukung).');
        }

        echo json_encode(['success' => true, 'data' => [
            'message' => "Thumbnail berhasil dibuat untuk $successCount file."
        ]]);
        exit;
    }

    if ($action === 'confirm_content') {
        $shortId = $input['short_id'] ?? '';
        $caption = $input['caption'] ?? '';
        $price = $input['price'] ?? 0;
        // ... (We don't have this action defined in content.php? Wait, it was in a different file maybe `public/webapp/api/action.php` or `content.php`?)
        // Let's check if confirm_content existed.
        // It didn't exist in the previous view.
    }

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

