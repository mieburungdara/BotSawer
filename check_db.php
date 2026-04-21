<?php
require_once __DIR__ . '/vendor/autoload.php';
// Bootstrapping the database
use Illuminate\Database\Capsule\Manager as DB;
$capsule = new DB;
$capsule->addConnection([
    'driver' => 'sqlite',
    'database' => __DIR__ . '/database.sqlite',
    'prefix' => '',
]);
$capsule->setAsGlobal();
$capsule->bootEloquent();

$usersColumns = DB::select("PRAGMA table_info(users)");
$creatorsColumns = DB::select("PRAGMA table_info(creators)");

header('Content-Type: application/json');
echo json_encode([
    'users' => $usersColumns,
    'creators' => $creatorsColumns
]);
