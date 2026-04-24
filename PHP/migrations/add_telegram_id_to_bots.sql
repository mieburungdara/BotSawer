-- Add telegram_id field to bots table for multi-bot support
ALTER TABLE bots ADD COLUMN telegram_id BIGINT UNSIGNED NULL UNIQUE COMMENT 'Telegram Bot ID' AFTER id;

-- Populate with actual Telegram bot IDs (replace with real values)
-- UPDATE bots SET telegram_id = YOUR_TELEGRAM_BOT_ID WHERE id = 1;