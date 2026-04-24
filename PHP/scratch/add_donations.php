<?php
$envPath = __DIR__ . '/../.env';
$env = parse_ini_file($envPath);
$db = new PDO("mysql:host={$env['DB_HOST']};dbname={$env['DB_NAME']};charset={$env['DB_CHARSET']}", $env['DB_USER'], $env['DB_PASSWORD']);
$db->exec("ALTER TABLE contents ADD COLUMN total_donations DECIMAL(15,2) DEFAULT 0, ADD COLUMN donation_count INT DEFAULT 0");
