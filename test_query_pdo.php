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
    
    $botId = 7715036030;
    
    echo "Testing with INT $botId:\n";
    $stmt = $pdo->prepare("SELECT username FROM bots WHERE bot_id = ? AND is_active = 1");
    $stmt->execute([$botId]);
    $res = $stmt->fetch();
    var_dump($res);

    echo "Testing with STRING '$botId':\n";
    $stmt = $pdo->prepare("SELECT username FROM bots WHERE bot_id = ? AND is_active = 1");
    $stmt->execute([(string)$botId]);
    $res = $stmt->fetch();
    var_dump($res);

} catch (Exception $e) {
    echo $e->getMessage();
}
