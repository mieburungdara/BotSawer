<?php
require_once 'vendor/autoload.php';
\BotSawer\Database::init();
use Illuminate\Database\Capsule\Manager as DB;

$botId = 7715036030;
$bot = DB::table('bots')
    ->where('bot_id', $botId)
    ->where('is_active', 1)
    ->first();

if ($bot) {
    echo "Found bot: " . $bot->username . "\n";
} else {
    echo "Bot NOT found\n";
    
    // Check without is_active
    $bot2 = DB::table('bots')->where('bot_id', $botId)->first();
    if ($bot2) {
        echo "Found bot without is_active check. is_active value: " . $bot2->is_active . "\n";
    } else {
        echo "Bot STILL NOT found even without is_active check\n";
        
        // Try searching by string
        $bot3 = DB::table('bots')->where('bot_id', (string)$botId)->first();
        if ($bot3) {
            echo "Found bot using STRING query\n";
        }
    }
}
