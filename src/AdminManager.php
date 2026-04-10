<?php

declare(strict_types=1);

namespace BotSawer;

use Illuminate\Database\Capsule\Manager as DB;
use Exception;

class AdminManager
{
    // Admin roles
    const ROLE_SUPER_ADMIN = 'super_admin';
    const ROLE_MODERATOR = 'moderator';
    const ROLE_FINANCE = 'finance';

    /**
     * Check if user is admin
     */
    public static function isAdmin(int $telegramId): bool
    {
        return DB::table('admins')
            ->where('telegram_id', $telegramId)
            ->where('is_active', 1)
            ->exists();
    }

    /**
     * Get admin info
     */
    public static function getAdmin(int $telegramId): ?object
    {
        return DB::table('admins')
            ->where('telegram_id', $telegramId)
            ->where('is_active', 1)
            ->first();
    }

    /**
     * Check if user has specific role
     */
    public static function hasRole(int $telegramId, string $role): bool
    {
        $admin = self::getAdmin($telegramId);
        return $admin && ($admin->role === $role || $admin->role === self::ROLE_SUPER_ADMIN);
    }

    /**
     * Check if user is super admin
     */
    public static function isSuperAdmin(int $telegramId): bool
    {
        return self::hasRole($telegramId, self::ROLE_SUPER_ADMIN);
    }

    /**
     * Check if user can moderate content
     */
    public static function canModerate(int $telegramId): bool
    {
        return self::hasRole($telegramId, self::ROLE_MODERATOR) ||
               self::hasRole($telegramId, self::ROLE_SUPER_ADMIN);
    }

    /**
     * Check if user can handle finance
     */
    public static function canHandleFinance(int $telegramId): bool
    {
        return self::hasRole($telegramId, self::ROLE_FINANCE) ||
               self::hasRole($telegramId, self::ROLE_SUPER_ADMIN);
    }

    /**
     * Add new admin
     */
    public static function addAdmin(int $telegramId, string $username, string $fullName, string $role, int $createdBy): bool
    {
        try {
            // Validate role
            $validRoles = [self::ROLE_SUPER_ADMIN, self::ROLE_MODERATOR, self::ROLE_FINANCE];
            if (!in_array($role, $validRoles)) {
                throw new Exception('Invalid role');
            }

            // Check if creator has permission
            if (!self::isSuperAdmin($createdBy)) {
                throw new Exception('Only super admin can add admins');
            }

            // Check if already exists
            $existing = DB::table('admins')->where('telegram_id', $telegramId)->first();
            if ($existing) {
                throw new Exception('Admin already exists');
            }

            DB::table('admins')->insert([
                'telegram_id' => $telegramId,
                'telegram_username' => $username,
                'full_name' => $fullName,
                'role' => $role,
                'created_by' => $createdBy,
                'is_active' => 1
            ]);

            AuditLogger::logAdminAction('add_admin', [
                'new_admin_telegram_id' => $telegramId,
                'new_admin_username' => $username,
                'new_admin_full_name' => $fullName,
                'assigned_role' => $role,
                'assigned_by_admin_id' => $createdBy
            ], $createdBy);

            Logger::info('New admin added', [
                'telegram_id' => $telegramId,
                'role' => $role,
                'created_by' => $createdBy
            ]);

            return true;
        } catch (Exception $e) {
            Logger::error('Failed to add admin', [
                'telegram_id' => $telegramId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Update admin role
     */
    public static function updateAdminRole(int $adminId, string $newRole, int $updatedBy): bool
    {
        try {
            if (!self::isSuperAdmin($updatedBy)) {
                throw new Exception('Only super admin can update roles');
            }

            $validRoles = [self::ROLE_SUPER_ADMIN, self::ROLE_MODERATOR, self::ROLE_FINANCE];
            if (!in_array($newRole, $validRoles)) {
                throw new Exception('Invalid role');
            }

            DB::table('admins')
                ->where('id', $adminId)
                ->update(['role' => $newRole]);

            // Get admin info for logging
            $targetAdmin = DB::table('admins')->where('id', $adminId)->first();
            if ($targetAdmin) {
                AuditLogger::logAdminAction('update_admin_role', [
                    'target_admin_id' => $adminId,
                    'target_admin_telegram_id' => $targetAdmin->telegram_id,
                    'target_admin_username' => $targetAdmin->telegram_username,
                    'old_role' => $targetAdmin->role,
                    'new_role' => $newRole,
                    'updated_by_admin_id' => $updatedBy
                ], $updatedBy);
            }

            return true;
        } catch (Exception $e) {
            Logger::error('Failed to update admin role', [
                'admin_id' => $adminId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Deactivate admin
     */
    public static function deactivateAdmin(int $adminId, int $deactivatedBy): bool
    {
        try {
            if (!self::isSuperAdmin($deactivatedBy)) {
                throw new Exception('Only super admin can deactivate admins');
            }

            DB::table('admins')
                ->where('id', $adminId)
                ->update(['is_active' => 0]);

            // Get admin info for logging
            $targetAdmin = DB::table('admins')->where('id', $adminId)->first();
            if ($targetAdmin) {
                AuditLogger::logAdminAction('deactivate_admin', [
                    'target_admin_id' => $adminId,
                    'target_admin_telegram_id' => $targetAdmin->telegram_id,
                    'target_admin_username' => $targetAdmin->telegram_username,
                    'target_admin_role' => $targetAdmin->role,
                    'deactivated_by_admin_id' => $deactivatedBy
                ], $deactivatedBy);
            }

            return true;
        } catch (Exception $e) {
            Logger::error('Failed to deactivate admin', [
                'admin_id' => $adminId,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Get all admins
     */
    public static function getAllAdmins(): array
    {
        return DB::table('admins')
            ->orderBy('created_at', 'desc')
            ->get()
            ->toArray();
    }

    /**
     * Update last login
     */
    public static function updateLastLogin(int $telegramId): void
    {
        DB::table('admins')
            ->where('telegram_id', $telegramId)
            ->update(['last_login' => now()]);
    }

    /**
     * Get admin statistics
     */
    public static function getAdminStats(): array
    {
        $stats = DB::table('admins')
            ->selectRaw('role, COUNT(*) as count')
            ->where('is_active', 1)
            ->groupBy('role')
            ->pluck('count', 'role')
            ->toArray();

        return [
            'total_admins' => array_sum($stats),
            'super_admins' => $stats[self::ROLE_SUPER_ADMIN] ?? 0,
            'moderators' => $stats[self::ROLE_MODERATOR] ?? 0,
            'finance_admins' => $stats[self::ROLE_FINANCE] ?? 0
        ];
    }
}