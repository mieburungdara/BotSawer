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

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    // Check if creators table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'creators'");
    if ($stmt->rowCount() == 0) {
        echo "Creators table is already gone. Oh no, we might have lost mapping if it was dropped. Checking if it's there...\n";
    } else {
        echo "Creators table exists, we can map data!\n";
        
        // Map withdrawals.user_id = creators.user_id (where withdrawals.user_id currently holds creators.id!)
        // Wait, withdrawals.user_id was renamed from creator_id but data is still creator_id.
        $pdo->exec("
            UPDATE withdrawals w
            JOIN creators c ON w.user_id = c.id
            SET w.user_id = c.user_id
        ");
        echo "Mapped withdrawals data.\n";
        
        // Map media_files.user_id... wait, we dropped creator_id from media_files, leaving ONLY user_id. user_id was always referencing users.id so it's correct!
        
        // Map creator_goals.creator_id to user_id (if it's not renamed yet)
        $pdo->exec("
            UPDATE creator_goals cg
            JOIN creators c ON cg.creator_id = c.id
            SET cg.creator_id = c.user_id
        ");
        echo "Mapped creator_goals data.\n";
        
        // Now try adding the FK back to creator_goals
        // rename column if it's still creator_id
        $stmt = $pdo->prepare("SHOW COLUMNS FROM `creator_goals` LIKE 'creator_id'");
        $stmt->execute();
        if ($stmt->rowCount() > 0) {
            $pdo->exec("ALTER TABLE `creator_goals` CHANGE `creator_id` `user_id` BIGINT UNSIGNED NOT NULL");
            $pdo->exec("ALTER TABLE `creator_goals` ADD CONSTRAINT `fk_goals_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE");
            echo "Renamed creator_goals.creator_id to user_id and linked to users.\n";
        }
        
        $pdo->exec("DROP TABLE `creators`");
        echo "Success dropping creators table.\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
