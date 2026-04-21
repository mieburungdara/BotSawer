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
        if (!isset($input['initData'])) {
            throw new Exception('Authentication required');
        }

        $initData = $input['initData'];

        if (empty($initData)) {
            throw new Exception('Authentication required');
        }

        // Parse init data to extract user
        parse_str($initData, $data);

        if (!isset($data['user']) || !isset($data['auth_date'])) {
            throw new Exception('Invalid authentication data');
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
