<?php

declare(strict_types=1);

namespace BotSawer;

// Scheduler script for posting media to public channel
// Run with cron: * * * * * cd /path/to/project && php schedule.php

require_once __DIR__ . '/vendor/autoload.php';
Database::init();

Logger::info('Scheduler started');

try {
    // Get current time
    $now = now();

    // Find media scheduled for posting
    $mediaToPost = \Illuminate\Database\Capsule\Manager::table('media_files')
        ->where('status', 'scheduled')
        ->where('scheduled_at', '<=', $now)
        ->orderBy('scheduled_at', 'asc')
        ->first();

    if (!$mediaToPost) {
        Logger::info('No media to post');
        exit(0);
    }

    Logger::info('Found media to post', ['media_id' => $mediaToPost->id]);

    // Get public channel from settings
    $publicChannel = \Illuminate\Database\Capsule\Manager::table('settings')
        ->where('key', 'public_channel')
        ->value('value');

    if (!$publicChannel) {
        Logger::error('Public channel not configured');
        exit(1);
    }

    // Get bot for posting (use first active bot)
    $botData = \Illuminate\Database\Capsule\Manager::table('bots')
        ->where('is_active', 1)
        ->first();

    if (!$botData) {
        Logger::error('No active bot found');
        exit(1);
    }

    // Initialize bot
    $bot = new Bot($botData->id);

    // Create deeplink
    $deeplink = "https://t.me/{$botData->username}?start=media_{$mediaToPost->id}";

    // Create caption with deeplink
    $caption = $mediaToPost->caption ?? 'Konten dari kreator';
    $caption .= "\n\n💸 Sawer → {$deeplink}";

    // Post to public channel (caption only, no media)
    $bot->getTelegram()->sendMessage([
        'chat_id' => $publicChannel,
        'text' => $caption,
        'parse_mode' => 'HTML'
    ]);

    // Update media status
    \Illuminate\Database\Capsule\Manager::table('media_files')
        ->where('id', $mediaToPost->id)
        ->update([
            'status' => 'posted',
            'posted_at' => $now
        ]);

    Logger::info('Media posted successfully', [
        'media_id' => $mediaToPost->id,
        'channel' => $publicChannel
    ]);

    // Notify creator
    $creator = \Illuminate\Database\Capsule\Manager::table('users')
        ->where('id', $mediaToPost->creator_id)
        ->value('telegram_id');

    if ($creator) {
        $bot->getTelegram()->sendMessage([
            'chat_id' => $creator,
            'text' => "✅ Media Anda telah diposting ke channel publik!\n\nID Media: #{$mediaToPost->id}\nChannel: {$publicChannel}"
        ]);
    }

} catch (Exception $e) {
    Logger::error('Scheduler error', [
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
    exit(1);
}

Logger::info('Scheduler finished');