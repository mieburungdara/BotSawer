<?php

declare(strict_types=1);

// Simple test script for basic functionality
// Run: php test.php

require_once __DIR__ . '/vendor/autoload.php';

echo "🧪 Testing BotSawer System\n\n";

try {
    // Test database connection
    echo "1. Testing database connection...\n";
    Database::init();
    echo "✅ Database connected\n\n";

    // Test logger
    echo "2. Testing logger...\n";
    Logger::info('Test log message');
    echo "✅ Logger working\n\n";

    // Test wallet
    echo "3. Testing wallet...\n";
    $balance = Wallet::getBalance(1);
    echo "✅ Wallet balance: Rp " . number_format($balance, 0, ',', '.') . "\n\n";

    // Test creator
    echo "4. Testing creator class...\n";
    $stats = Creator::getStats(1);
    echo "✅ Creator stats loaded\n\n";

    echo "🎉 All basic tests passed!\n\n";
    echo "Next steps:\n";
    echo "- Update .env with real database credentials\n";
    echo "- Set admin telegram IDs in webhook and webapp\n";
    echo "- Configure bot token and channels in database\n";
    echo "- Set up cron job: * * * * * cd /path/to/project && php schedule.php\n";
    echo "- Test bot commands and webapp\n";

} catch (Exception $e) {
    echo "❌ Test failed: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}