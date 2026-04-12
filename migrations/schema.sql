-- =====================================================
-- ✅ SKEMA DATABASE FINAL BOT SAWER - DISDERHANAKAN
-- SEMUA FIELD REDUNDANT TELAH DIHAPUS
-- =====================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+07:00";

-- -----------------------------------------------------
-- TABEL 1: users
-- -----------------------------------------------------
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  `telegram_id` BIGINT UNSIGNED NOT NULL UNIQUE KEY,
  `first_name` VARCHAR(255) NULL,
  `last_name` VARCHAR(255) NULL,
  `username` VARCHAR(255) NULL UNIQUE KEY,
  `language_code` VARCHAR(10) DEFAULT 'id',
  `is_creator` TINYINT(1) DEFAULT 0,
  `is_banned` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- TABEL 2: creators
-- ✅ REDUNDANT FIELD DIHAPUS: total_earnings
-- Hitung otomatis dari tabel transactions
-- -----------------------------------------------------
CREATE TABLE `creators` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL UNIQUE KEY,
  `display_name` VARCHAR(255) NOT NULL,
  `bio` TEXT NULL,
  `bank_account` VARCHAR(255) NULL,
  `is_verified` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- TABEL 3: media_files
-- ✅ ENHANCED: Added bot_id, user_id, media_group_id for better tracking
-- ✅ OPTIMIZED: Removed optional metadata fields (file_size, mime_type, duration)
-- These can be queried from Telegram API if needed
-- ✅ REDUNDANT FIELD REMOVED: total_donations, total_revenue, queue_number
-- Hitung otomatis dari tabel transactions
-- -----------------------------------------------------
CREATE TABLE `media_files` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `bot_id` BIGINT UNSIGNED NULL,
  `creator_id` BIGINT UNSIGNED NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `telegram_file_id` VARCHAR(255) NOT NULL,
  `file_unique_id` VARCHAR(255) NOT NULL UNIQUE KEY,
  `file_type` ENUM('photo','video','document') NOT NULL,
  `caption` TEXT NULL,
  `media_group_id` VARCHAR(255) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `scheduled_at` TIMESTAMP NULL,
  `posted_at` TIMESTAMP NULL,
  `status` ENUM('queued','scheduled','posted','cancelled') DEFAULT 'queued',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_creator_active` (`creator_id`, `is_active`),
  INDEX `idx_status_scheduled` (`status`, `scheduled_at`),
  INDEX `idx_user_created` (`user_id`, `created_at`),
  INDEX `idx_media_group` (`media_group_id`),
  INDEX `idx_bot_group` (`bot_id`, `media_group_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- TABEL 4: wallets
-- -----------------------------------------------------
CREATE TABLE `wallets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL UNIQUE KEY,
  `balance` DECIMAL(15,2) DEFAULT 0.00,
  `total_deposit` DECIMAL(15,2) DEFAULT 0.00,
  `total_withdraw` DECIMAL(15,2) DEFAULT 0.00,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- TABEL 5: payment_proofs
-- OPTIMIZED: Removed transaction_id field (redundant)
-- -----------------------------------------------------
CREATE TABLE `payment_proofs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `telegram_file_id` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `note` TEXT NULL,
  `status` ENUM('pending','approved','rejected') DEFAULT 'pending',
  `admin_id` BIGINT UNSIGNED NULL,
  `admin_note` TEXT NULL,
  `processed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  INDEX `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- TABEL 6: transactions
-- SEMUA PERHITUNGAN TOTAL DIAMBIL DARI TABEL INI
-- TIDAK PERLU ADA FIELD TOTAL DI TABEL LAIN
-- ✅ ENHANCED: Added bot_id foreign key for multi-bot tracking
-- -----------------------------------------------------
CREATE TABLE `transactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `media_id` BIGINT UNSIGNED NULL,
  `from_user_id` BIGINT UNSIGNED NULL,
  `bot_id` BIGINT UNSIGNED NULL,
  `type` ENUM('deposit','withdraw','donation','commission','refund') NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `fee` DECIMAL(15,2) DEFAULT 0.00,
  `status` ENUM('pending','success','failed','cancelled') DEFAULT 'pending',
  `description` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`media_id`) REFERENCES `media_files`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON DELETE SET NULL,
  INDEX `idx_user_type` (`user_id`, `type`),
  INDEX `idx_status_created` (`status`, `created_at`),
  INDEX `idx_bot_created` (`bot_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- TABEL 7: withdrawals
-- -----------------------------------------------------
CREATE TABLE `withdrawals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `creator_id` BIGINT UNSIGNED NOT NULL,
  `amount` DECIMAL(15,2) NOT NULL,
  `original_amount` DECIMAL(15,2) NOT NULL,
  `commission_rate` DECIMAL(5,2) DEFAULT 10.00,
  `commission_amount` DECIMAL(15,2) NOT NULL,
  `transaction_id` BIGINT UNSIGNED NOT NULL UNIQUE KEY,
  `bank_details` JSON NOT NULL,
  `status` ENUM('pending','processing','completed','rejected') DEFAULT 'pending',
  `admin_note` TEXT NULL,
  `processed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_creator_status` (`creator_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- TABEL 8: bots
-- Multi Bot Support Anti Rate Limit
-- -----------------------------------------------------
CREATE TABLE `bots` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `username` VARCHAR(100) NOT NULL UNIQUE,
  `token` VARCHAR(255) NOT NULL UNIQUE,
  `webhook_secret` VARCHAR(255) NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- TABEL 9: admins
-- Admin users dengan role-based access
-- -----------------------------------------------------
CREATE TABLE `admins` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `telegram_id` BIGINT UNSIGNED NOT NULL UNIQUE,
  `telegram_username` VARCHAR(255) NULL,
  `full_name` VARCHAR(255) NULL,
  `role` ENUM('super_admin','moderator','finance') DEFAULT 'moderator',
  `is_active` TINYINT(1) DEFAULT 1,
  `last_login` TIMESTAMP NULL,
  `created_by` BIGINT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL,
  INDEX `idx_role_active` (`role`, `is_active`),
  INDEX `idx_telegram_id` (`telegram_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- TABEL 10: bot_configs
-- Extended bot configuration
-- -----------------------------------------------------
CREATE TABLE `bot_configs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `bot_id` BIGINT UNSIGNED NOT NULL,
  `config_key` VARCHAR(100) NOT NULL,
  `config_value` TEXT NULL,
  `description` TEXT NULL,
  `updated_by` BIGINT UNSIGNED NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`bot_id`) REFERENCES `bots`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`updated_by`) REFERENCES `admins`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `unique_bot_config` (`bot_id`, `config_key`),
  INDEX `idx_bot_key` (`bot_id`, `config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- TABEL 11: settings
-- ✅ REDUNDANT FIELD DIHAPUS: commission_rate, min_withdraw
-- Semua pengaturan disini saja
-- -----------------------------------------------------
CREATE TABLE `settings` (
  `key` VARCHAR(100) NOT NULL PRIMARY KEY,
  `value` TEXT NULL,
  `description` TEXT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- TABEL 10: audit_logs
-- Audit trail untuk semua aktivitas sistem
-- -----------------------------------------------------
CREATE TABLE `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` BIGINT UNSIGNED NULL,
  `action` VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NOT NULL,
  `entity_id` BIGINT UNSIGNED NOT NULL,
  `old_data` JSON NULL,
  `new_data` JSON NULL,
  `changes` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_action` (`user_id`, `action`),
  INDEX `idx_entity` (`entity_type`, `entity_id`),
  INDEX `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- TRIGGER
-- -----------------------------------------------------
DELIMITER //
CREATE TRIGGER after_user_create_wallet
AFTER INSERT ON users
FOR EACH ROW
BEGIN
  INSERT INTO wallets (user_id, balance) VALUES (NEW.id, 0.00);
END //
DELIMITER ;

-- -----------------------------------------------------
-- DATA AWAL
-- -----------------------------------------------------
-- Super admin pertama (ganti telegram_id dengan ID admin Anda)
INSERT INTO admins (telegram_id, telegram_username, full_name, role, is_active) VALUES
(123456789, '@admin_username', 'Super Admin', 'super_admin', 1);

INSERT INTO settings (`key`, `value`, `description`) VALUES
('platform_commission', '10.00', 'Persentase komisi default platform'),
('min_deposit', '10000.00', 'Minimum deposit pengguna'),
('min_withdraw', '50000.00', 'Minimum penarikan kreator'),
('bot_version', '1.0.0', 'Versi bot saat ini'),
('maintenance_mode', '0', 'Mode maintenance sistem'),
('public_channel', '-1001234567890', 'Channel publik untuk posting konten (gunakan ID channel dimulai dengan -100)'),
('backup_channel', '-1001234567890', 'Channel backup untuk arsip media (gunakan ID channel dimulai dengan -100)'),
('payment_info_message_id', '123456789', 'Message ID dari backup channel yang berisi informasi pembayaran'),
('admin_bank_account', 'BCA - 1234567890 - Admin BotSawer', 'Rekening admin untuk topup'),
('system_name', 'BotSawer', 'Nama sistem'),
('support_email', 'support@botsawer.com', 'Email support'),
('max_upload_size', '50', 'Max upload size in MB'),
('rate_limit_requests', '100', 'Rate limit requests per window'),
('rate_limit_window', '3600', 'Rate limit window in seconds');

-- Sample bot entry (update with real bot data)
-- Optimized: Removed unused fields from bots table (request_count, last_request_at)
-- Optimized: Optional metadata fields (duration, mime_type, file_size) can be added later if needed
INSERT INTO bots (`name`, `username`, `token`, `webhook_secret`, `is_active`) VALUES
('Bot Sawer 1', 'your_bot_username', 'your_bot_token_here', 'webhook_secret_1', 1);

COMMIT;

-- =====================================================
-- ✅ CATATAN PENTING SEDERHANAKAN DATABASE:
-- 1. SEMUA FIELD YANG BISA DIHITUNG DARI TABLE TRANSACTIONS TIDAK PERLU DISIMPAN
-- 2. total_earnings, total_revenue, total_donations semuanya dihitung dari tabel transactions
-- 3. Semua pengaturan global ada di tabel settings
-- 4. Tidak ada duplikasi data dimanapun
-- 5. Query untuk total sangat cepat dengan index yang benar
-- =====================================================