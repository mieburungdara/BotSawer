<?php
$envPath = __DIR__ . '/../.env';
$env = parse_ini_file($envPath);

if (!$env) {
    die("Gagal membaca .env\n");
}

try {
    $dsn = "mysql:host={$env['DB_HOST']};dbname={$env['DB_NAME']};charset={$env['DB_CHARSET']}";
    $db = new PDO($dsn, $env['DB_USER'], $env['DB_PASSWORD']);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Memeriksa tabel imagekit_accounts...\n";
    $db->exec("CREATE TABLE IF NOT EXISTS imagekit_accounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        imagekit_id VARCHAR(255) UNIQUE,
        public_key VARCHAR(255),
        private_key VARCHAR(255),
        url_endpoint VARCHAR(255),
        is_active TINYINT(1) DEFAULT 1,
        usage_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    echo "Tabel imagekit_accounts siap.\n";

    echo "Memeriksa kolom pada tabel media_files...\n";
    try {
        $db->exec("ALTER TABLE media_files ADD COLUMN imagekit_file_id VARCHAR(255) NULL AFTER file_unique_id");
        echo "Kolom imagekit_file_id ditambahkan.\n";
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') === false) {
            echo "Error: " . $e->getMessage() . "\n";
        }
    }

    try {
        $db->exec("ALTER TABLE media_files ADD COLUMN imagekit_url VARCHAR(255) NULL AFTER imagekit_file_id");
        echo "Kolom imagekit_url ditambahkan.\n";
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') === false) {
            echo "Error: " . $e->getMessage() . "\n";
        }
    }

    echo "Migrasi ImageKit selesai.\n";
} catch (PDOException $e) {
    echo "Koneksi gagal: " . $e->getMessage() . "\n";
}
