-- -----------------------------------------------------
-- TABEL 12: creator_goals
-- Menambahkan fitur Target Donasi
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `creator_goals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `creator_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `target_amount` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  `status` ENUM('active','completed','cancelled') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`creator_id`) REFERENCES `creators`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  INDEX `idx_creator_status` (`creator_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
