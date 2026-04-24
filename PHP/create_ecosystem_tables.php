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
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS channels (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        type ENUM('public', 'private') DEFAULT 'public',
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS groups (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        description TEXT,
        is_active TINYINT(1) DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // Seeding Channels
    $checkC = $pdo->query("SELECT COUNT(*) FROM channels");
    if ($checkC->fetchColumn() == 0) {
        $stmt = $pdo->prepare("INSERT INTO channels (name, username, description, category, type) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute(['Bot Sawer Updates', 'VesperAppAnnouncements', 'Channel resmi informasi update fitur terbaru.', 'Official', 'public']);
        $stmt->execute(['Kreator Hub', 'VesperAppCreators', 'Komunitas kreator saling berbagi tips.', 'Community', 'public']);
        $stmt->execute(['Digital Asset Sale', 'VesperAppMarket', 'Marketplace untuk aset digital.', 'Market', 'public']);
    }

    // Seeding Groups
    $checkG = $pdo->query("SELECT COUNT(*) FROM groups");
    if ($checkG->fetchColumn() == 0) {
        $stmt = $pdo->prepare("INSERT INTO groups (name, username, description) VALUES (?, ?, ?)");
        $stmt->execute(['Diskusi Kreator', 'VesperAppGroup', 'Grup diskusi bebas untuk seluruh pengguna.']);
        $stmt->execute(['Bantuan Teknis', 'VesperAppSupportGroup', 'Grup khusus untuk tanya jawab teknis.']);
    }

    echo "Tables channels and groups created and seeded.\n";
} catch (Exception $e) {
    echo $e->getMessage();
}

