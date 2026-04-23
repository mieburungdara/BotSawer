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
    $stmt = $pdo->query("SHOW TABLES");
    var_dump($stmt->fetchAll(PDO::FETCH_COLUMN));
} catch (Exception $e) {
    echo $e->getMessage();
}
