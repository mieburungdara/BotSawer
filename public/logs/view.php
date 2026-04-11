<?php

declare(strict_types=1);

// Simple log viewer for AI inspection
// Access: /logs/view.php

$logFile = __DIR__ . '/../../logs/errors.log';

if (!file_exists($logFile)) {
    http_response_code(404);
    echo 'Log file not found.';
    exit;
}

if (!is_readable($logFile)) {
    http_response_code(403);
    echo 'Log file not accessible.';
    exit;
}

// Simple auth check (optional, for security)
$authKey = $_GET['key'] ?? '';
if ($authKey !== 'ai_inspection_2026') {
    http_response_code(401);
    echo 'Unauthorized access.';
    exit;
}

header('Content-Type: text/plain; charset=utf-8');
readfile($logFile);