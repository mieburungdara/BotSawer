<?php
$host = 'lucky.jagoanhosting.id';
$db   = 'boxanonm_botsawer';
$user = 'boxanonm_db';
$pass = '8dsmGE9nx6gvwbG';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

echo "Connecting to remote database at $host...\n";

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "Connection successful!\n\n";

    // 1. Add columns to 'users' if they don't exist
    $columns = [
        'display_name' => 'VARCHAR(255) NULL',
        'bio' => 'TEXT NULL',
        'bank_account' => 'VARCHAR(255) NULL',
        'is_verified' => 'TINYINT(1) DEFAULT 0',
        'photo_url' => 'TEXT NULL'
    ];

    echo "--- Checking users columns ---\n";
    foreach ($columns as $col => $def) {
        $stmt = $pdo->prepare("SHOW COLUMNS FROM `users` LIKE ?");
        $stmt->execute([$col]);
        if ($stmt->rowCount() == 0) {
            $pdo->exec("ALTER TABLE `users` ADD COLUMN `$col` $def");
            echo "Added column: $col\n";
        } else {
            echo "Column exists: $col\n";
        }
    }

    // 2. Migrate data from 'creators' to 'users'
    echo "\n--- Migrating creator data ---\n";
    $creatorsExist = $pdo->query("SHOW TABLES LIKE 'creators'")->rowCount() > 0;
    if ($creatorsExist) {
        $count = $pdo->exec("
            UPDATE users u
            JOIN creators c ON u.id = c.user_id
            SET 
                u.display_name = c.display_name,
                u.bio = c.bio,
                u.bank_account = c.bank_account,
                u.is_verified = c.is_verified
        ");
        echo "Migrated $count records from creators to users.\n";
    }

    // Prepare default display_name for users who were not creators
    $count = $pdo->exec("
        UPDATE users
        SET display_name = TRIM(CONCAT(IFNULL(first_name, ''), ' ', IFNULL(last_name, '')))
        WHERE display_name IS NULL OR display_name = ''
    ");
    echo "Set default display_name for $count users.\n";

    // 3. Drop Foreign Keys referencing creators before altering tables
    echo "\n--- Handling Foreign Keys ---\n";
    function dropForeignKey($pdo, $table, $refTable) {
        $stmt = $pdo->prepare("
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME = ?
        ");
        global $db;
        $stmt->execute([$db, $table, $refTable]);
        while ($row = $stmt->fetch()) {
            $fk = $row['CONSTRAINT_NAME'];
            try {
                $pdo->exec("ALTER TABLE `$table` DROP FOREIGN KEY `$fk`");
                echo "Dropped FK $fk from $table\n";
            } catch (Exception $e) {
                echo "Could not drop FK $fk: " . $e->getMessage() . "\n";
            }
        }
    }

    if ($creatorsExist) {
        dropForeignKey($pdo, 'media_files', 'creators');
        dropForeignKey($pdo, 'withdrawals', 'creators');
        dropForeignKey($pdo, 'creator_goals', 'creators'); // if exists
        
        // We know media_files already has user_id doing the exact same thing!
        // We can safely drop creator_id from media_files.
        $stmt = $pdo->prepare("SHOW COLUMNS FROM `media_files` LIKE 'creator_id'");
        $stmt->execute();
        if ($stmt->rowCount() > 0) {
            $pdo->exec("ALTER TABLE `media_files` DROP COLUMN `creator_id`");
            echo "Dropped column creator_id from media_files.\n";
        }

        // For withdrawals, rename creator_id to user_id
        $stmt = $pdo->prepare("SHOW COLUMNS FROM `withdrawals` LIKE 'creator_id'");
        $stmt->execute();
        if ($stmt->rowCount() > 0) {
            // Re-point constraint to users
            $pdo->exec("ALTER TABLE `withdrawals` CHANGE `creator_id` `user_id` BIGINT UNSIGNED NOT NULL");
            $pdo->exec("ALTER TABLE `withdrawals` ADD CONSTRAINT `fk_withdrawals_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE");
            echo "Renamed withdrawals.creator_id to user_id and linked to users.\n";
        }

        // For creator_goals, rename creator_id to user_id
        $stmt = $pdo->query("SHOW TABLES LIKE 'creator_goals'");
        if ($stmt->rowCount() > 0) {
            $stmt = $pdo->prepare("SHOW COLUMNS FROM `creator_goals` LIKE 'creator_id'");
            $stmt->execute();
            if ($stmt->rowCount() > 0) {
                $pdo->exec("ALTER TABLE `creator_goals` CHANGE `creator_id` `user_id` BIGINT UNSIGNED NOT NULL");
                $pdo->exec("ALTER TABLE `creator_goals` ADD CONSTRAINT `fk_goals_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE");
                echo "Renamed creator_goals.creator_id to user_id and linked to users.\n";
            }
        }

        // Finally, drop creators table
        $pdo->exec("DROP TABLE IF EXISTS `creators`");
        echo "Dropped creators table.\n";
    } else {
        echo "creators table already dropped.\n";
    }

    echo "\n✔ Migration completed successfully!\n";

} catch (\PDOException $e) {
    echo "\n❌ Error: " . $e->getMessage() . "\n";
    if (strpos($e->getMessage(), '2002') !== false || strpos($e->getMessage(), 'Access denied') !== false) {
        echo "Pastikan IP lokal kita whitelist di 'Remote MySQL' pada cPanel lucky.jagoanhosting.id.\n";
    }
}
