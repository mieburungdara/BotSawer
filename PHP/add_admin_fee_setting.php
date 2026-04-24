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
    
    $check = $pdo->prepare("SELECT * FROM settings WHERE `key` = 'withdrawal_admin_fee'");
    $check->execute();
    if (!$check->fetch()) {
        $stmt = $pdo->prepare("INSERT INTO settings (`key`, `value`, `description`) VALUES ('withdrawal_admin_fee', '2500', 'Biaya admin flat setiap penarikan (misal ke E-Wallet)')");
        $stmt->execute();
        echo "Setting withdrawal_admin_fee added.\n";
    } else {
        echo "Setting withdrawal_admin_fee already exists.\n";
    }
} catch (Exception $e) {
    echo $e->getMessage();
}
