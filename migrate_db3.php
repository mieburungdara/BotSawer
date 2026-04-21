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
    
    // Map withdrawals data using the current column name which might be user_id
    $stmt = $pdo->prepare("SHOW COLUMNS FROM `withdrawals` LIKE 'user_id'");
    $stmt->execute();
    if ($stmt->rowCount() > 0) {
        $pdo->exec("
            UPDATE withdrawals w
            JOIN creators c ON w.user_id = c.id
            SET w.user_id = c.user_id
        ");
        echo "Mapped withdrawals data.\n";
    }

    // Map creator_goals data using user_id column
    $stmt = $pdo->prepare("SHOW COLUMNS FROM `creator_goals` LIKE 'user_id'");
    $stmt->execute();
    if ($stmt->rowCount() > 0) {
        $pdo->exec("
            UPDATE creator_goals cg
            JOIN creators c ON cg.user_id = c.id
            SET cg.user_id = c.user_id
        ");
        echo "Mapped creator_goals data.\n";
        
        try {
            $pdo->exec("ALTER TABLE `creator_goals` ADD CONSTRAINT `fk_goals_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE");
            echo "Linked creator_goals to users.\n";
        } catch (Exception $e) {}
    }
    
    // Drop creators table
    $pdo->exec("DROP TABLE IF EXISTS `creators`");
    echo "Success dropping creators table.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
