<?php

declare(strict_types=1);

namespace BotSawer;

use Exception;
use Illuminate\Database\Capsule\Manager as DB;

/**
 * Shared authentication helper for WebApp API endpoints.
 * Validates Telegram initData on every request instead of relying on PHP sessions.
 */
class WebAppAuth
{
    /**
     * Authenticate the current request using Telegram initData.
     * Returns the database user ID if valid, throws Exception otherwise.
     *
     * @param array $input The decoded JSON input from the request body.
     * @returns int The authenticated database user ID.
     * @throws Exception If authentication fails.
     */
    public static function authenticate(array $input): int
    {
        if (!isset($input['initData']) || !isset($input['botId'])) {
            throw new Exception('Authentication required');
        }

        $initData = $input['initData'];
        $botId = (int)$input['botId'];

        // Get bot token for hash verification
        $bot = DB::table('bots')->where('id', $botId)->first();
        if (!$bot) {
            throw new Exception('Bot tidak ditemukan.');
        }

        // Parse init data to extract user and hash
        parse_str($initData, $data);
        
        if (!isset($data['hash']) || !isset($data['user']) || !isset($data['auth_date'])) {
            throw new Exception('Invalid authentication data');
        }

        // Verify Hash (Security)
        $receivedHash = $data['hash'];
        unset($data['hash']);
        
        $dataCheckArr = [];
        foreach ($data as $key => $value) {
            $dataCheckArr[] = "$key=$value";
        }
        sort($dataCheckArr);
        $dataCheckString = implode("\n", $dataCheckArr);

        $secretKey = hash_hmac('sha256', $bot->token, 'WebAppData', true);
        $calculatedHash = hash_hmac('sha256', $dataCheckString, $secretKey);

        if (!hash_equals($receivedHash, $calculatedHash)) {
            // Logger::warning('WebApp Auth: Hash mismatch', ['received' => $receivedHash, 'calculated' => $calculatedHash]);
            throw new Exception('Authentication failed: Data integrity check failed');
        }

        $telegramUser = json_decode($data['user'], true);
        if (!$telegramUser || !isset($telegramUser['id']) || !is_numeric($telegramUser['id'])) {
            throw new Exception('Invalid user data');
        }

        // Check auth_date not too old (within 24 hours)
        $authDate = (int)($data['auth_date'] ?? 0);
        if (time() - $authDate > 86400) {
            throw new Exception('Authentication expired');
        }

        // Look up user in database
        $user = DB::table('users')
            ->where('telegram_id', (string)$telegramUser['id'])
            ->first();

        if (!$user) {
            throw new Exception('Akun tidak ditemukan. Silakan mulai bot terlebih dahulu dengan perintah /start');
        }

        return (int)$user->id;
    }
}
