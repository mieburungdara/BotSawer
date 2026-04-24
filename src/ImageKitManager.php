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
     * Upload a file from a URL to ImageKit
     * 
     * @param string $telegramUrl Direct URL to the Telegram file
     * @param string $fileName Desired file name (usually short_id.jpg)
     * @return array Contains 'url' and 'fileId'
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
