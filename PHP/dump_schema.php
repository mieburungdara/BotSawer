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

$schema = DB::select("SELECT type, name, sql FROM sqlite_master WHERE type='table';");

foreach($schema as $table) {
    if (strpos($table->name, 'sqlite_') !== 0) {
        echo "=== " . $table->name . " ===\n";
        echo $table->sql . "\n\n";
    }
}
