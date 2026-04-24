<?php
$envPath = __DIR__ . '/../.env';
$env = parse_ini_file($envPath);
$db = new PDO("mysql:host={$env['DB_HOST']};dbname={$env['DB_NAME']};charset={$env['DB_CHARSET']}", $env['DB_USER'], $env['DB_PASSWORD']);
print_r($db->query('SHOW CREATE TABLE users')->fetchAll(PDO::FETCH_ASSOC));
print_r($db->query('SHOW CREATE TABLE bots')->fetchAll(PDO::FETCH_ASSOC));
