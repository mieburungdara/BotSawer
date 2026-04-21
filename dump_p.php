<?php
try {
    $db = new PDO('sqlite:' . __DIR__ . '/database.sqlite');
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $result = $db->query("SELECT type, name, sql FROM sqlite_master WHERE type='table';");
    foreach($result as $row) {
        if (strpos($row['name'], 'sqlite_') !== 0) {
            echo "=== " . $row['name'] . " ===\n";
            echo $row['sql'] . "\n\n";
        }
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
