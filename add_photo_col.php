<?php
require_once __DIR__ . '/vendor/autoload.php';
use Illuminate\Database\Capsule\Manager as DB;
use BotSawer\Database;

Database::init();

try {
    // Check if photo_url exists
    $columns = DB::select("SHOW COLUMNS FROM users LIKE 'photo_url'");
    if (empty($columns)) {
        DB::statement("ALTER TABLE users ADD COLUMN photo_url TEXT NULL");
        echo "Column photo_url added to users table.\n";
    } else {
        echo "Column photo_url already exists in users table.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
