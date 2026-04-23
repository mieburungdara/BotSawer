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
    
    // Update status ENUM to include 'draft'
    $pdo->exec("ALTER TABLE media_files MODIFY COLUMN status ENUM('draft', 'queued', 'scheduled', 'posted', 'cancelled', 'rejected') DEFAULT 'draft'");
    
    // Add thumb_file_id column if not exists
    $pdo->exec("ALTER TABLE media_files ADD COLUMN IF NOT EXISTS thumb_file_id VARCHAR(255) NULL AFTER file_unique_id");

    echo "Table schema updated successfully.\n";
} catch (Exception $e) {
    echo $e->getMessage();
}
