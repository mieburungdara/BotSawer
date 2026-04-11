<?php

declare(strict_types=1);

namespace BotSawer;

use Illuminate\Database\Capsule\Manager as DB;

// Scheduler script for posting media to public channel
// Run with cron: * * * * * cd /path/to/project && php schedule.php

require_once __DIR__ . '/vendor/autoload.php';
Database::init();

Logger::info('Scheduler started');

try {
    // Get current time
    $now = \Carbon\Carbon::now();

    // Find media scheduled for posting
    $mediaToPost = DB::table('media_files')
        ->where('status', 'scheduled')
        ->where('scheduled_at', '<=', $now)
        ->orderBy('scheduled_at', 'asc')
        ->first();

    if (!$mediaToPost) {
        Logger::info('No media to post');
        exit(0);
    }

    Logger::info('Found media to post', ['media_id' => $mediaToPost->id]);

    // Update status to 'posting' atomically to prevent race conditions
    $updated = DB::table('media_files')
        ->where('id', $mediaToPost->id)
        ->where('status', 'scheduled')
        ->update(['status' => 'posting']);

    if ($updated === 0) {
        Logger::info('Media already being processed by another instance', ['media_id' => $mediaToPost->id]);
        exit(0);
    }

    // Get public channel from settings
    $publicChannel = DB::table('settings')
        ->where('key', 'public_channel')
        ->value('value');

    if (!$publicChannel) {
        Logger::error('Public channel not configured');
        // Revert status
        DB::table('media_files')
            ->where('id', $mediaToPost->id)
            ->update(['status' => 'scheduled']);
        exit(1);
    }

    // Get bot for posting (use first active bot)
    $botData = DB::table('bots')
        ->where('is_active', 1)
        ->first();

    if (!$botData) {
        Logger::error('No active bot found');
        // Revert status
        DB::table('media_files')
            ->where('id', $mediaToPost->id)
            ->update(['status' => 'scheduled']);
        exit(1);
    }

    // Initialize bot
    $bot = new Bot($botData->id);

    // Create deeplink (use username if available, otherwise use bot ID)
    $botIdentifier = $botData->username ?: "bot{$botData->id}";
    $deeplink = "https://t.me/{$botIdentifier}?start=media_{$mediaToPost->id}";

    // Create caption with deeplink
    $caption = $mediaToPost->caption ?? 'Konten dari kreator';
    $caption .= "\n\n💸 Sawer → {$deeplink}";

    try {
        // Post to public channel (caption only, no media)
        $bot->getTelegram()->sendMessage([
            'chat_id' => $publicChannel,
            'text' => $caption,
            'parse_mode' => 'HTML'
        ]);

        // Update media status to posted
        DB::table('media_files')
            ->where('id', $mediaToPost->id)
            ->update([
                'status' => 'posted',
                'posted_at' => $now
            ]);

        Logger::info('Media posted successfully', [
            'media_id' => $mediaToPost->id,
            'channel' => $publicChannel
        ]);
    } catch (Exception $e) {
        Logger::error('Failed to post media to channel', [
            'media_id' => $mediaToPost->id,
            'channel' => $publicChannel,
            'error' => $e->getMessage()
        ]);
        // Revert status to 'scheduled' for retry
        DB::table('media_files')
            ->where('id', $mediaToPost->id)
            ->update(['status' => 'scheduled']);
        exit(1);
    }

    // Notify creator
    $creator = DB::table('users')
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