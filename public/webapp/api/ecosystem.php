<?php
require_once __DIR__ . '/../../../vendor/autoload.php';
require_once __DIR__ . '/../../../src/config.php';

header('Content-Type: application/json');

try {
    $bots = $pdo->query("SELECT * FROM bots WHERE is_active = 1")->fetchAll(PDO::FETCH_ASSOC);
    $channels = $pdo->query("SELECT * FROM channels WHERE is_active = 1")->fetchAll(PDO::FETCH_ASSOC);
    $groups = $pdo->query("SELECT * FROM groups WHERE is_active = 1")->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => [
            'bots' => $bots,
            'channels' => $channels,
            'groups' => $groups
        ]
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => $e->getMessage()]);
}
