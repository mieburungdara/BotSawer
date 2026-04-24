<?php
$envPath = __DIR__ . '/../.env';
$env = parse_ini_file($envPath);
$dsn = "mysql:host={$env['DB_HOST']};dbname={$env['DB_NAME']};charset={$env['DB_CHARSET']}";
$db = new PDO($dsn, $env['DB_USER'], $env['DB_PASSWORD']);
$stmt = $db->query("SHOW CREATE TABLE media_files");
print_r($stmt->fetchAll(PDO::FETCH_ASSOC));
