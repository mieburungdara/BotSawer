<?php

declare(strict_types=1);

namespace BotSawer;

require_once __DIR__ . '/../vendor/autoload.php';

// Load environment
$dotenv = \Dotenv\Dotenv::createImmutable(__DIR__ . '/..');
$dotenv->load();

// Initialize database
Database::init();

function generateUniqueId() {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    $length = mt_rand(6, 8); // Start with random length between 6-8 for better distribution
    $maxLength = 20; // Safety limit
    $attempts = 0;
    $maxAttempts = 1000; // Prevent infinite loop

    do {
        $id = '';
        for ($i = 0; $i < $length; $i++) {
            $id .= $chars[mt_rand(0, strlen($chars) - 1)];
        }

        // Check if this ID is already used
        try {
            $exists = \Illuminate\Database\Capsule\Manager::table('users')->where('uuid', $id)->exists();
        } catch (Exception $e) {
            echo "Database error during uniqueness check for UUID: {$id}\n";
            throw new Exception('Database error during UUID generation');
        }

        if ($exists) {
            $length = min($length + 1, $maxLength); // Increase length if not unique
        }

        $attempts++;
        if ($attempts >= $maxAttempts) {
            echo "Failed to generate unique ID after {$maxAttempts} attempts\n";
            throw new Exception('Unable to generate unique ID after maximum attempts');
        }
    } while ($exists);

    // Final validation
    if (empty($id) || strlen($id) < 6 || strlen($id) > 20) {
        echo "Generated invalid UUID: {$id} (length: " . strlen($id) . ")\n";
        throw new Exception('Generated UUID is invalid');
    }

    return $id;
}

// Generate unique ID for users without UUID
try {
    $users = \Illuminate\Database\Capsule\Manager::table('users')
        ->where(function($query) {
            $query->whereNull('uuid')
                  ->orWhere('uuid', '');
        })
        ->orderBy('id')
        ->get();

    $totalUsers = count($users);
    echo "Found {$totalUsers} users without UUID\n";

    if ($totalUsers === 0) {
        echo "No users need UUID generation. Migration complete.\n";
        exit(0);
    }

    $updated = 0;
    $errors = 0;
    $batchSize = 50; // Smaller batch size for better progress tracking
    $processed = 0;

    foreach ($users as $user) {
        if ($processed > 0 && $processed % $batchSize === 0) {
            echo "Processed {$processed}/{$totalUsers} users (updated: {$updated}, errors: {$errors})...\n";
        }

        try {
            $uniqueId = generateUniqueId();

            // Use transaction for atomicity, but simpler check
            \Illuminate\Database\Capsule\Manager::transaction(function () use ($user, $uniqueId) {
                // Check if user still needs UUID (avoid duplicate work)
                $needsUpdate = \Illuminate\Database\Capsule\Manager::table('users')
                    ->where('id', $user->id)
                    ->where(function($query) {
                        $query->whereNull('uuid')
                              ->orWhere('uuid', '');
                    })
                    ->exists();

                if ($needsUpdate) {
                    \Illuminate\Database\Capsule\Manager::table('users')
                        ->where('id', $user->id)
                        ->update(['uuid' => $uniqueId]);
                }
            });

            $updated++;
            $processed++;
            if ($processed <= 5 || $processed % 10 === 0) { // Log first 5 and every 10th
                echo "✓ Updated user ID {$user->id} with UUID: {$uniqueId}\n";
            }

        } catch (Exception $e) {
            $errors++;
            $processed++;
            echo "✗ Error updating user ID {$user->id}: " . $e->getMessage() . "\n";
        }
    }

    echo "\nMigration completed: {$updated} updated, {$errors} errors, {$totalUsers} total\n";

    if ($errors > 0) {
        echo "⚠️  Migration completed with {$errors} errors. Check logs above.\n";
        exit(1);
    }

} catch (Exception $e) {
    echo "Fatal error during migration: " . $e->getMessage() . "\n";
    exit(1);
}

echo "Updated {$updated} users with unique IDs\n";