<?php

declare(strict_types=1);

// Error handler for webapp
function customErrorHandler($errno, $errstr, $errfile, $errline) {
    // Determine error level
    $errorLevel = match($errno) {
        E_ERROR, E_CORE_ERROR, E_COMPILE_ERROR, E_PARSE => 'critical',
        E_WARNING, E_CORE_WARNING, E_COMPILE_WARNING => 'warning',
        E_NOTICE, E_USER_NOTICE => 'notice',
        E_USER_ERROR, E_RECOVERABLE_ERROR => 'error',
        default => 'error'
    };

    // Log the error with context
    \BotSawer\Logger::logError("PHP $errorLevel: $errstr", [
        'errno' => $errno,
        'file' => $errfile,
        'line' => $errline,
        'url' => $_SERVER['REQUEST_URI'] ?? 'unknown',
        'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ]);

    // For production, don't show detailed errors
    if (getenv('APP_ENV') === 'production') {
        if ($errno & (E_ERROR | E_CORE_ERROR | E_COMPILE_ERROR | E_PARSE)) {
            http_response_code(500);
            include __DIR__ . '/500.html';
            exit;
        }
    } else {
        // In development, continue showing errors normally
        return false;
    }
}

function customExceptionHandler($exception) {
    // Log the exception with full context
    \BotSawer\Logger::logCritical('Uncaught Exception', [
        'url' => $_SERVER['REQUEST_URI'] ?? 'unknown',
        'method' => $_SERVER['REQUEST_METHOD'] ?? 'unknown',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown',
        'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        'session_id' => session_id(),
        'post_data' => !empty($_POST) ? \BotSawer\Logger::sanitizeRequestData($_POST) : null,
        'get_data' => !empty($_GET) ? $_GET : null
    ], $exception);

    // For production, show friendly error page
    if (getenv('APP_ENV') === 'production') {
        http_response_code(500);
        include __DIR__ . '/500.html';
        exit;
    } else {
        // In development, show full error details
        echo '<div style="background: #f8d7da; color: #721c24; padding: 20px; margin: 20px; border: 1px solid #f5c6cb; border-radius: 5px; font-family: monospace;">';
        echo '<h2 style="margin-top: 0;">🚫 Uncaught Exception</h2>';
        echo '<strong>Message:</strong> ' . htmlspecialchars($exception->getMessage()) . '<br>';
        echo '<strong>File:</strong> ' . htmlspecialchars($exception->getFile()) . ':' . $exception->getLine() . '<br>';
        echo '<strong>Code:</strong> ' . $exception->getCode() . '<br><br>';
        echo '<strong>Stack Trace:</strong><br>';
        echo '<pre style="background: #f1f1f1; padding: 10px; border-radius: 3px; overflow-x: auto;">' . htmlspecialchars($exception->getTraceAsString()) . '</pre>';
        echo '</div>';
    }
}

// Set error handlers
set_error_handler('customErrorHandler');
set_exception_handler('customExceptionHandler');

// Check maintenance mode
try {
    require_once __DIR__ . '/../vendor/autoload.php';
    BotSawer\Database::init();

    $maintenanceMode = \Illuminate\Database\Capsule\Manager::table('settings')
        ->where('key', 'maintenance_mode')
        ->value('value');

    if ($maintenanceMode === '1' && !isset($_GET['bypass_maintenance'])) {
        include __DIR__ . '/maintenance.html';
        exit;
    }
} catch (Exception $e) {
    // If database is down, still show maintenance
    include __DIR__ . '/maintenance.html';
    exit;
}