<?php
try {
    $env = file_get_contents('.env');
    preg_match_all('/^([^#\s][^=]*)=(.*)$/m', $env, $matches);
    $config = [];
    foreach ($matches[1] as $i => $key) {
        $config[$key] = trim($matches[2][$i]);
    }
    
    $dsn = "mysql:host={$config['DB_HOST']};dbname={$config['DB_NAME']};charset=utf8mb4";
    $pdo = new PDO($dsn, $config['DB_USER'], $config['DB_PASSWORD']);
    
    // Update file_type ENUM to include 'audio'
    $pdo->exec("ALTER TABLE media_files MODIFY COLUMN file_type ENUM('photo', 'video', 'document', 'audio') NOT NULL");

    echo "file_type ENUM updated successfully.\n";
} catch (Exception $e) {
    echo $e->getMessage();
}
