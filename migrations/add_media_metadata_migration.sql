-- Migration: Add enhanced media metadata fields
-- Date: 2026-04-13
-- Description: Add bot_id, user_id, media_group_id to media_files table for better tracking

-- Simple migration: Add new columns and constraints
-- These statements will succeed if elements don't exist, or be ignored if they do exist
-- This works in MySQL 5.7+ and MariaDB

ALTER TABLE `media_files` ADD COLUMN IF NOT EXISTS `bot_id` BIGINT UNSIGNED NULL AFTER `creator_id`;
ALTER TABLE `media_files` ADD COLUMN IF NOT EXISTS `user_id` BIGINT UNSIGNED NOT NULL AFTER `bot_id`;
ALTER TABLE `media_files` ADD COLUMN IF NOT EXISTS `media_group_id` VARCHAR(255) NULL AFTER `caption`;

-- Add foreign keys (will be skipped if they already exist)
ALTER TABLE `media_files` ADD CONSTRAINT IF NOT EXISTS `fk_media_bot` FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON DELETE SET NULL;
ALTER TABLE `media_files` ADD CONSTRAINT IF NOT EXISTS `fk_media_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes (will be skipped if they already exist)
ALTER TABLE `media_files` ADD INDEX IF NOT EXISTS `idx_user_created` (`user_id`, `created_at`);
ALTER TABLE `media_files` ADD INDEX IF NOT EXISTS `idx_media_group` (`media_group_id`);
ALTER TABLE `media_files` ADD INDEX IF NOT EXISTS `idx_bot_group` (`bot_id`, `media_group_id`);

-- Update existing records to set user_id from creator relationship
UPDATE `media_files` mf
JOIN `creators` c ON mf.creator_id = c.id
SET mf.user_id = c.user_id
WHERE mf.user_id IS NULL;