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

        $streakData = self::getStreakData($creatorId);

        return [
            'total_media' => $totalMedia,
            'total_earnings' => $totalEarnings,
            'total_donations' => $totalDonations,
            'current_streak' => $streakData['current_streak'],
            'max_streak' => $streakData['max_streak'],
            'last_publish_date' => $streakData['last_publish_date'],
            'streak_badge' => $streakData['streak_badge']
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

    public static function getStreakData(int $creatorId): array
    {
        // Get distinct publish dates
        $publishDates = DB::table('media_files')
            ->where('creator_id', $creatorId)
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
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));

        // Calculate current streak
        $currentStreak = 0;
        $checkDate = $today;

        // If last publish is today or yesterday, start counting
        if ($lastPublishDate === $today || $lastPublishDate === $yesterday) {
            $currentStreak = 1;
            $checkDate = date('Y-m-d', strtotime($lastPublishDate . ' -1 day'));

            while (in_array($checkDate, $publishDates)) {
                $currentStreak++;
                $checkDate = date('Y-m-d', strtotime($checkDate . ' -1 day'));
            }
        }

        // Calculate max streak
        $maxStreak = 1;
        $tempStreak = 1;

        for ($i = 1; $i < count($publishDates); $i++) {
            $prevDate = date('Y-m-d', strtotime($publishDates[$i-1] . ' -1 day'));
            if ($publishDates[$i] === $prevDate) {
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

        // Generate HTML progress bar
        $milestoneText = $nextMilestone === 7 ? '7 Hari' : ($nextMilestone === 14 ? '14 Hari' : '30 Hari');
        $progressBarHtml = '
        <div class="streak-progress">
            <div class="streak-label">Progress ke ' . $milestoneText . ' Streak</div>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ' . round($progress, 1) . '%"></div>
            </div>
            <div class="progress-text">' . $progressText . ' (' . round($progress, 1) . '%)</div>
        </div>
        <style>
        .streak-progress { margin: 15px 0; }
        .streak-label { font-weight: bold; margin-bottom: 5px; color: #333; }
        .progress-bar { background: #eee; height: 20px; border-radius: 10px; overflow: hidden; }
        .progress-fill { background: linear-gradient(90deg, #ff6b6b, #4ecdc4); height: 100%; transition: width 0.3s ease; }
        .progress-text { margin-top: 5px; font-size: 14px; color: #666; }
        </style>';

        return [
            'current_streak' => $currentStreak,
            'max_streak' => $maxStreak,
            'last_publish_date' => $lastPublishDate,
            'streak_badge' => $streakBadge,
            'streak_progress' => [
                'current' => $currentStreak,
                'target' => $nextMilestone,
                'percentage' => round($progress, 1),
                'text' => $progressText,
                'html' => $progressBarHtml
            ]
        ];
    }
}
}