<?php

declare(strict_types=1);

namespace VesperApp;

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
     * Get a specific account by parsing the URL
     */
    public static function getAccountByUrl(string $fullUrl): ?object
    {
        $parsed = parse_url($fullUrl);
        $path = ltrim($parsed['path'] ?? '', '/');
        $pathParts = explode('/', $path);
        $ikIdInUrl = $pathParts[0] ?? '';

        if (empty($ikIdInUrl)) return null;

        // Lookup by imagekit_id or by checking if ikIdInUrl is part of url_endpoint
        return DB::table('imagekit_accounts')
            ->where('imagekit_id', $ikIdInUrl)
            ->orWhere('url_endpoint', 'LIKE', '%' . $ikIdInUrl . '%')
            ->first();
    }

    /**
     * Generate a signed URL for security
     */
    public static function signUrl(string $fullUrl, array $transformations = [], int $expiry = 3600): string
    {
        try {
            $parsed = parse_url($fullUrl);
            if (!isset($parsed['path'])) return $fullUrl;

            $account = self::getAccountByUrl($fullUrl);
            if (!$account) return $fullUrl;

            // Extract path after the ImageKit ID
            $path = ltrim($parsed['path'], '/');
            $pathParts = explode('/', $path);
            // Reconstruct path excluding the first part (imagekit_id)
            $filePath = '/' . implode('/', array_slice($pathParts, 1));

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
            'folder' => '/VesperApp_media/',
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

