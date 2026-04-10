<?php

declare(strict_types=1);

namespace BotSawer;

use Illuminate\Database\Capsule\Manager as DB;
use Exception;

class Creator
{
    public static function register(int $userId, string $displayName, ?string $bio = null, ?string $bankAccount = null): bool
    {
        try {
            // Check if user exists
            $user = DB::table('users')->where('id', $userId)->first();
            if (!$user) {
                throw new Exception('User not found');
            }

            // Check if already a creator
            $existing = DB::table('creators')->where('user_id', $userId)->first();
            if ($existing) {
                throw new Exception('User is already a creator');
            }

            DB::table('creators')->insert([
                'user_id' => $userId,
                'display_name' => $displayName,
                'bio' => $bio,
                'bank_account' => $bankAccount,
                'is_verified' => 0
            ]);

            // Update user as creator
            DB::table('users')->where('id', $userId)->update(['is_creator' => 1]);

            Logger::info('Creator registered', ['user_id' => $userId, 'display_name' => $displayName]);

            return true;
        } catch (Exception $e) {
            Logger::error('Creator registration failed', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    public static function updateProfile(int $creatorId, array $data): bool
    {
        try {
            $updateData = [];
            if (isset($data['display_name'])) $updateData['display_name'] = $data['display_name'];
            if (isset($data['bio'])) $updateData['bio'] = $data['bio'];
            if (isset($data['bank_account'])) $updateData['bank_account'] = $data['bank_account'];

            if (empty($updateData)) {
                return true;
            }

            $updateData['updated_at'] = \Carbon\Carbon::now();

            $affected = DB::table('creators')->where('id', $creatorId)->update($updateData);

            if ($affected > 0) {
                Logger::info('Creator profile updated', ['creator_id' => $creatorId]);
            }

            return $affected > 0;
        } catch (Exception $e) {
            Logger::error('Creator profile update failed', [
                'creator_id' => $creatorId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    public static function getProfile(int $userId): ?object
    {
        return DB::table('creators')->where('user_id', $userId)->first();
    }

    public static function getById(int $creatorId): ?object
    {
        return DB::table('creators')->where('id', $creatorId)->first();
    }

    public static function verifyCreator(int $creatorId, bool $verified = true): bool
    {
        try {
            DB::table('creators')
                ->where('id', $creatorId)
                ->update(['is_verified' => $verified ? 1 : 0]);

            Logger::info('Creator verification updated', [
                'creator_id' => $creatorId,
                'verified' => $verified
            ]);

            return true;
        } catch (Exception $e) {
            Logger::error('Creator verification failed', [
                'creator_id' => $creatorId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    public static function getMediaCount(int $creatorId): int
    {
        return DB::table('media_files')->where('creator_id', $creatorId)->count();
    }

    public static function getTotalEarnings(int $creatorId): int
    {
        return (int) DB::table('transactions')
            ->where('user_id', $creatorId)
            ->where('type', 'donation')
            ->where('status', 'success')
            ->sum('amount');
    }

    public static function getStats(int $creatorId): array
    {
        $totalMedia = self::getMediaCount($creatorId);
        $totalEarnings = self::getTotalEarnings($creatorId);
        $totalDonations = DB::table('transactions')
            ->where('user_id', $creatorId)
            ->where('type', 'donation')
            ->where('status', 'success')
            ->count();

        return [
            'total_media' => $totalMedia,
            'total_earnings' => $totalEarnings,
            'total_donations' => $totalDonations
        ];
    }

    public static function getAllCreators(int $limit = 50, int $offset = 0): array
    {
        return DB::table('creators')
            ->join('users', 'creators.user_id', '=', 'users.id')
            ->select('creators.*', 'users.first_name', 'users.last_name', 'users.username')
            ->limit($limit)
            ->offset($offset)
            ->get()
            ->toArray();
    }

    public static function searchCreators(string $query, int $limit = 20): array
    {
        return DB::table('creators')
            ->join('users', 'creators.user_id', '=', 'users.id')
            ->where('creators.display_name', 'like', "%{$query}%")
            ->orWhere('users.username', 'like', "%{$query}%")
            ->select('creators.*', 'users.first_name', 'users.last_name', 'users.username')
            ->limit($limit)
            ->get()
            ->toArray();
    }
}