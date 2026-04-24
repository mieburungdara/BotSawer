<?php

declare(strict_types=1);

namespace BotSawer;

use Illuminate\Database\Capsule\Manager as DB;
use ImageKit\ImageKit;
use Exception;

class ImageKitManager
{
    private static ?array $activeAccounts = null;

    /**
     * Get an active ImageKit account. Uses random rotation.
     */
    private static function getAccount(): object
    {
        if (self::$activeAccounts === null) {
            self::$activeAccounts = DB::table('imagekit_accounts')
                ->where('is_active', 1)
                ->get()
                ->toArray();
        }

        if (empty(self::$activeAccounts)) {
            throw new Exception('Tidak ada akun ImageKit yang aktif. Silakan tambahkan di database.');
        }

        // Random rotation
        $index = array_rand(self::$activeAccounts);
        $account = self::$activeAccounts[$index];

        // Increment usage count
        DB::table('imagekit_accounts')->where('id', $account->id)->increment('usage_count');

        return $account;
    }

    /**
     * Get a specific account by its ImageKit ID (from URL)
     */
    public static function getAccountById(string $imageKitId): ?object
    {
        return DB::table('imagekit_accounts')
            ->where('imagekit_id', $imageKitId)
            ->first();
    }

    /**
     * Generate a signed URL for security
     * 
     * @param string $fullUrl The original full ImageKit URL
     * @param array $transformations List of transformations (e.g. [['blur' => 30]])
     * @param int $expiry Seconds until the link expires
     */
    public static function signUrl(string $fullUrl, array $transformations = [], int $expiry = 3600): string
    {
        try {
            // Extract imagekit_id and path
            // URL format: https://ik.imagekit.io/tboxmyid/folder/file.jpg
            $parsed = parse_url($fullUrl);
            if (!isset($parsed['path'])) return $fullUrl;

            $pathParts = explode('/', ltrim($parsed['path'], '/'));
            $imageKitId = $pathParts[0];
            $filePath = '/' . implode('/', array_slice($pathParts, 1));

            $account = self::getAccountById($imageKitId);
            if (!$account) return $fullUrl;

            $imageKit = new ImageKit(
                $account->public_key,
                $account->private_key,
                $account->url_endpoint
            );

            return $imageKit->url([
                'path' => $filePath,
                'transformation' => $transformations,
                'signed' => true,
                'expire' => $expiry
            ]);
        } catch (Exception $e) {
            return $fullUrl;
        }
    }

    /**
     * Upload a file from a URL to ImageKit
     */
    public static function uploadFromUrl(string $telegramUrl, string $fileName): array
    {
        $account = self::getAccount();

        $imageKit = new ImageKit(
            $account->public_key,
            $account->private_key,
            $account->url_endpoint
        );

        $uploadResponse = $imageKit->uploadFiles([
            'file' => $telegramUrl,
            'fileName' => $fileName,
            'folder' => '/botsawer_media/',
            'useUniqueFileName' => false
        ]);

        if (isset($uploadResponse->error) && $uploadResponse->error) {
            throw new Exception('Gagal upload ke ImageKit: ' . json_encode($uploadResponse->error));
        }

        return [
            'url' => $uploadResponse->result->url,
            'fileId' => $uploadResponse->result->fileId
        ];
    }
}
