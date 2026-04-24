<?php

declare(strict_types=1);

namespace VesperApp;

use Illuminate\Database\Capsule\Manager as DB;
use Exception;

class Creator
{
    /**
     * Register a new creator (Set is_creator flag and update profile)
     */
    public static function register(int $userId, string $displayName, ?string $bio = null, ?string $bankAccount = null): bool
    {
        try {
            // Check if user exists
            $user = DB::table('users')->where('id', $userId)->first();
            if (!$user) {
                throw new Exception('User not found');
            }

            DB::table('users')->where('id', $userId)->update([
                'display_name' => $displayName,
                'bio' => $bio,
                'bank_account' => $bankAccount,
                'is_creator' => 1,
                'is_verified' => 0
            ]);

            Logger::info('Creator registered', ['user_id' => $userId, 'display_name' => $displayName]);

            return true;
        } catch (Exception $e) {
            Logger::error('Creator registration failed', [
                'user_id' => $userId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    public static function updateProfile(int $creatorId, array $data): bool
    {
        try {
            $creator = DB::table('users')->where('id', $creatorId)->first();
            if (!$creator) {
                Logger::warning('User profile update failed: user not found', [
                    'user_id' => $creatorId
                ]);
                return false;
            }

            $updateData = [];
            if (isset($data['display_name'])) $updateData['display_name'] = $data['display_name'];
            if (isset($data['bio'])) $updateData['bio'] = $data['bio'];
            if (isset($data['bank_account'])) $updateData['bank_account'] = $data['bank_account'];

            if (empty($updateData)) {
                return true;
            }

            $updateData['updated_at'] = \Carbon\Carbon::now();

            $affected = DB::table('users')->where('id', $creatorId)->update($updateData);

            if ($affected > 0) {
                Logger::info('User profile updated', ['user_id' => $creatorId]);
            }

            return $affected > 0;
        } catch (Exception $e) {
            Logger::error('User profile update failed', [
                'user_id' => $creatorId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    public static function getProfile(int $userId): ?object
    {
        return DB::table('users')->where('id', $userId)->first();
    }

    public static function verifyCreator(int $creatorId, bool $verified = true): bool
    {
        try {
            $creator = DB::table('users')->where('id', $creatorId)->first();
            if (!$creator) {
                Logger::warning('User verification failed: user not found', [
                    'user_id' => $creatorId
                ]);
                return false;
            }

            DB::table('users')
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
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            return false;
        }
    }

    public static function getMediaCount(int $creatorId): int
    {
        $creator = DB::table('users')->where('id', $creatorId)->first();
        if (!$creator) {
            return 0;
        }
        return (int) DB::table('media_files')->where('user_id', $creatorId)->count();
    }

    public static function getTotalEarnings(int $creatorId): int
    {
        $creator = DB::table('users')->where('id', $creatorId)->first();
        if (!$creator) {
            return 0;
        }
        return (int) DB::table('transactions')
            ->where('user_id', $creatorId)
            ->where('type', 'donation')
            ->where('status', 'success')
            ->sum('amount');
    }

    public static function getStats(int $creatorId): array
    {
        // Check if creator exists first
        $creator = DB::table('users')->where('id', $creatorId)->first();
        if (!$creator) {
            return [
                'total_media' => 0,
                'total_earnings' => 0,
                'total_donations' => 0,
                'current_streak' => 0,
                'max_streak' => 0,
                'last_publish_date' => null,
                'streak_badge' => 'Belum mulai'
            ];
        }

        // Combined query to avoid N+1 problem
        $stats = DB::table('media_files')
            ->leftJoin('transactions', function ($join) use ($creatorId) {
                $join->on('media_files.user_id', '=', DB::raw($creatorId))
                     ->where('transactions.type', '=', 'donation')
                     ->where('transactions.status', '=', 'success');
            })
            ->where('media_files.user_id', $creatorId)
            ->selectRaw('
                COUNT(DISTINCT media_files.id) as total_media,
                COALESCE(SUM(transactions.amount), 0) as total_earnings,
                COUNT(transactions.id) as total_donations
            ')
            ->first();

        $streakData = self::getStreakData($creatorId);
        $activeGoal = self::getActiveGoal($creatorId);

        return [
            'total_media' => (int)$stats->total_media,
            'total_earnings' => (int)$stats->total_earnings,
            'total_donations' => (int)$stats->total_donations,
            'current_streak' => $streakData['current_streak'],
            'max_streak' => $streakData['max_streak'],
            'last_publish_date' => $streakData['last_publish_date'],
            'streak_badge' => $streakData['streak_badge'],
            'active_goal' => $activeGoal
        ];
    }

    public static function getActiveGoal(int $creatorId): ?array
    {
        $goal = DB::table('creator_goals')
            ->where('user_id', $creatorId)
            ->where('status', 'active')
            ->first();

        if (!$goal) {
            return null;
        }

        // Calculate current progress since goal was created
        $currentAmount = DB::table('transactions')
            ->where('user_id', $creatorId)
            ->where('type', 'donation')
            ->where('status', 'success')
            ->where('created_at', '>=', $goal->created_at)
            ->sum('amount') ?? 0;

        return [
            'id' => (int)$goal->id,
            'title' => $goal->title,
            'target_amount' => (float)$goal->target_amount,
            'current_amount' => (float)$currentAmount,
            'percentage' => min(100, round(($currentAmount / $goal->target_amount) * 100, 1)),
            'is_completed' => $currentAmount >= $goal->target_amount,
            'created_at' => $goal->created_at
        ];
    }

    public static function saveGoal(int $creatorId, string $title, float $targetAmount): bool
    {
        try {
            return Database::transaction(function () use ($creatorId, $title, $targetAmount) {
                // Deactivate any existing active goals
                DB::table('creator_goals')
                    ->where('user_id', $creatorId)
                    ->where('status', 'active')
                    ->update(['status' => 'cancelled']);

                // Insert new goal
                DB::table('creator_goals')->insert([
                    'user_id' => $creatorId,
                    'title' => $title,
                    'target_amount' => $targetAmount,
                    'status' => 'active',
                    'created_at' => \Carbon\Carbon::now()
                ]);

                return true;
            });
        } catch (\Exception $e) {
            Logger::error('Failed to save creator goal', ['creator_id' => $creatorId, 'error' => $e->getMessage()]);
            return false;
        }
    }

    public static function deleteGoal(int $creatorId, int $goalId): bool
    {
        return DB::table('creator_goals')
            ->where('id', $goalId)
            ->where('user_id', $creatorId)
            ->update(['status' => 'cancelled']) > 0;
    }

    public static function getAllCreators(int $limit = 50, int $offset = 0): array
    {
        return DB::table('users')
            ->where('is_private', 0) // Exclude private users
            ->select('*')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->offset($offset)
            ->get()
            ->toArray();
    }

    public static function searchCreators(string $query, int $limit = 20): array
    {
        $searchTerm = "%{$query}%";
        return DB::table('users')
            ->where('is_private', 0) // Exclude private users
            ->where(function($q) use ($searchTerm, $query) {
                $q->where('display_name', 'like', $searchTerm)
                  ->orWhere('username', 'like', $searchTerm)
                  ->orWhere('first_name', 'like', $searchTerm)
                  ->orWhere('last_name', 'like', $searchTerm);
            })
            ->select('*')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->toArray();
    }

    public static function getStreakData(int $creatorId): array
    {
        // Check if creator exists
        $creator = DB::table('users')->where('id', $creatorId)->first();
        if (!$creator) {
            return [
                'current_streak' => 0,
                'max_streak' => 0,
                'last_publish_date' => null,
                'streak_badge' => 'Belum mulai'
            ];
        }

        // Get distinct publish dates
        $publishDates = DB::table('media_files')
            ->where('user_id', $creatorId)
            ->selectRaw('DISTINCT DATE(created_at) as publish_date')
            ->orderBy('publish_date', 'desc')
            ->pluck('publish_date')
            ->toArray();

        if (empty($publishDates)) {
            return [
                'current_streak' => 0,
                'max_streak' => 0,
                'last_publish_date' => null,
                'streak_badge' => 'Belum mulai'
            ];
        }

        $lastPublishDate = $publishDates[0];
        $now = \Carbon\Carbon::now();
        $today = $now->toDateString();
        $yesterday = $now->copy()->subDay()->toDateString();

        // Calculate current streak
        $currentStreak = 0;
        $checkDate = $today;

        // If last publish is today or yesterday, start counting
        if ($lastPublishDate === $today || $lastPublishDate === $yesterday) {
            $currentStreak = 1;
            $checkDateObj = \Carbon\Carbon::parse($lastPublishDate)->subDay();

            while (in_array($checkDateObj->toDateString(), $publishDates)) {
                $currentStreak++;
                $checkDateObj = $checkDateObj->copy()->subDay();
            }
        }

        // Calculate max streak
        $maxStreak = 1;
        $tempStreak = 1;

        for ($i = 1; $i < count($publishDates); $i++) {
            $prevDateObj = \Carbon\Carbon::parse($publishDates[$i-1])->subDay();
            if ($publishDates[$i] === $prevDateObj->toDateString()) {
                $tempStreak++;
                $maxStreak = max($maxStreak, $tempStreak);
            } else {
                $tempStreak = 1;
            }
        }

        // Determine streak badge
        $streakBadge = 'Belum mulai';
        if ($currentStreak >= 1) $streakBadge = 'Pemula';
        if ($currentStreak >= 3) $streakBadge = 'Rutin';
        if ($currentStreak >= 7) $streakBadge = 'Ahli';
        if ($currentStreak >= 14) $streakBadge = 'Master';
        if ($currentStreak >= 30) $streakBadge = 'Legenda';

        // Calculate progress to next milestone
        $milestones = [7, 14, 30];
        $nextMilestone = null;
        foreach ($milestones as $ms) {
            if ($currentStreak < $ms) {
                $nextMilestone = $ms;
                break;
            }
        }
        if ($nextMilestone === null) {
            $nextMilestone = 30; // Max milestone
        }
        $progress = min(($currentStreak / $nextMilestone) * 100, 100);
        $progressText = "{$currentStreak}/{$nextMilestone} hari";

        return [
            'current_streak' => $currentStreak,
            'max_streak' => $maxStreak,
            'last_publish_date' => $lastPublishDate,
            'streak_badge' => $streakBadge,
            'streak_progress' => [
                'current' => $currentStreak,
                'target' => $nextMilestone,
                'percentage' => round($progress, 1),
                'text' => $progressText
            ]
        ];
    }
}
