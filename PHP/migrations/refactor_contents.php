<?php
$envPath = __DIR__ . '/../.env';
$env = parse_ini_file($envPath);
$dsn = "mysql:host={$env['DB_HOST']};dbname={$env['DB_NAME']};charset={$env['DB_CHARSET']}";
$db = new PDO($dsn, $env['DB_USER'], $env['DB_PASSWORD']);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "Mulai migrasi refaktor database...\n";

try {
    $db->beginTransaction();

    echo "1. Membuat tabel contents...\n";
    $db->exec("CREATE TABLE IF NOT EXISTS contents (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        short_id VARCHAR(32) UNIQUE NOT NULL,
        bot_id BIGINT UNSIGNED,
        user_id BIGINT UNSIGNED NOT NULL,
        caption TEXT,
        media_group_id VARCHAR(255),
        status ENUM('draft','queued','scheduled','posted','cancelled','rejected') DEFAULT 'draft',
        is_active TINYINT(1) DEFAULT 1,
        scheduled_at TIMESTAMP NULL DEFAULT NULL,
        posted_at TIMESTAMP NULL DEFAULT NULL,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE SET NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    echo "2. Menyalin data unik dari media_files ke contents...\n";
    // Assuming each short_id is currently unique in media_files
    $db->exec("INSERT INTO contents (short_id, bot_id, user_id, caption, media_group_id, status, is_active, scheduled_at, posted_at, notes, created_at, updated_at)
        SELECT short_id, bot_id, user_id, caption, media_group_id, status, is_active, scheduled_at, posted_at, notes, created_at, updated_at 
        FROM media_files 
        GROUP BY short_id");

    echo "3. Menambahkan kolom content_id pada media_files...\n";
    try {
        $db->exec("ALTER TABLE media_files ADD COLUMN content_id BIGINT UNSIGNED AFTER id");
    } catch (Exception $e) {
        if (strpos($e->getMessage(), 'Duplicate column name') === false) {
            throw $e;
        }
    }

    echo "4. Menghubungkan media_files dengan contents...\n";
    $db->exec("UPDATE media_files m JOIN contents c ON m.short_id = c.short_id SET m.content_id = c.id");

    echo "5. Menambahkan Foreign Key pada media_files...\n";
    $db->exec("ALTER TABLE media_files ADD CONSTRAINT fk_media_content FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE");

    echo "6. Menghapus kolom redundan dari media_files...\n";
    // We must drop foreign keys first
    try {
        $db->exec("ALTER TABLE media_files DROP FOREIGN KEY media_files_ibfk_1"); // bot_id
        $db->exec("ALTER TABLE media_files DROP FOREIGN KEY media_files_ibfk_3"); // user_id
    } catch (Exception $e) {
        // FK might not exist or named differently
    }

    $db->exec("ALTER TABLE media_files 
        DROP COLUMN short_id,
        DROP COLUMN bot_id,
        DROP COLUMN user_id,
        DROP COLUMN caption,
        DROP COLUMN media_group_id,
        DROP COLUMN is_active,
        DROP COLUMN scheduled_at,
        DROP COLUMN posted_at,
        DROP COLUMN status,
        DROP COLUMN notes
    ");

    $db->commit();
    echo "Migrasi Selesai! Database kini mendukung struktur Album yang rapi.\n";

} catch (Exception $e) {
    $db->rollBack();
    echo "Migrasi Gagal: " . $e->getMessage() . "\n";
}
