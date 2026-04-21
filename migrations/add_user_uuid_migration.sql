-- Migration to add UUID field for user anonymity
-- Run this after the main schema.sql


-- Add unique ID and privacy fields to users table
ALTER TABLE `users` ADD COLUMN `uuid` VARCHAR(20) UNIQUE AFTER `id`;
ALTER TABLE `users` ADD COLUMN `is_private` TINYINT(1) DEFAULT 1 AFTER `is_banned`;

-- Generate UUID for existing users using PHP function
-- Run this PHP script after adding the column:
-- <?php
-- require 'vendor/autoload.php';
-- use BotSawer\Database;
-- Database::init();
-- $users = \Illuminate\Database\Capsule\Manager::table('users')->whereNull('uuid')->get();
-- foreach ($users as $user) {
--     $uuid = sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
--         mt_rand(0, 0xffff), mt_rand(0, 0xffff),
--         mt_rand(0, 0xffff),
--         mt_rand(0, 0x0fff) | 0x4000,
--         mt_rand(0, 0x3fff) | 0x8000,
--         mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
--     );
--     \Illuminate\Database\Capsule\Manager::table('users')->where('id', $user->id)->update(['uuid' => $uuid]);
-- }

-- Add index for UUID lookups
ALTER TABLE `users` ADD INDEX `idx_uuid` (`uuid`);