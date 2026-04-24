<?php

declare(strict_types=1);

namespace VesperApp;

use Monolog\Logger as MonologLogger;
use Monolog\Handler\StreamHandler;
use Monolog\Handler\RotatingFileHandler;
use Monolog\Processor\UidProcessor;

class Logger
{
    private static ?MonologLogger $logger = null;
    private static ?MonologLogger $errorLogger = null;

    public static function getInstance(): MonologLogger
    {
        if (self::$logger === null) {
            self::$logger = new MonologLogger('VesperApp');

            // Add UID processor for request tracking
            self::$logger->pushProcessor(new UidProcessor());

            // Rotating file handler for application logs (30 days retention)
            $logPath = dirname(__DIR__) . '/logs/app.log';
            $rotatingHandler = new RotatingFileHandler($logPath, 30, MonologLogger::DEBUG);
            self::$logger->pushHandler($rotatingHandler);

            // Also log errors to stderr for development
            if (getenv('APP_ENV') !== 'production') {
                $streamHandler = new StreamHandler('php://stderr', MonologLogger::WARNING);
                self::$logger->pushHandler($streamHandler);
            }
        }

        return self::$logger;
    }

    public static function getErrorLogger(): MonologLogger
    {
        if (self::$errorLogger === null) {
            self::$errorLogger = new MonologLogger('VesperApp_errors');

            // Add UID processor for request tracking
            self::$errorLogger->pushProcessor(new UidProcessor());

            // Dedicated error log file
            $errorLogPath = dirname(__DIR__) . '/logs/errors.log';
            $errorHandler = new StreamHandler($errorLogPath, MonologLogger::WARNING);
            self::$errorLogger->pushHandler($errorHandler);

            // Also log critical errors to stderr
            if (getenv('APP_ENV') !== 'production') {
                $stderrHandler = new StreamHandler('php://stderr', MonologLogger::ERROR);
                self::$errorLogger->pushHandler($stderrHandler);
            }
        }

        return self::$errorLogger;
    }

    public static function emergency(string $message, array $context = []): void
    {
        self::getInstance()->emergency($message, $context);
    }

    public static function alert(string $message, array $context = []): void
    {
        self::getInstance()->alert($message, $context);
    }

    public static function critical(string $message, array $context = []): void
    {
        self::getInstance()->critical($message, $context);
    }

    public static function error(string $message, array $context = []): void
    {
        self::getInstance()->error($message, $context);
    }

    public static function warning(string $message, array $context = []): void
    {
        self::getInstance()->warning($message, $context);
    }

    public static function notice(string $message, array $context = []): void
    {
        self::getInstance()->notice($message, $context);
    }

    public static function info(string $message, array $context = []): void
    {
        self::getInstance()->info($message, $context);
    }

    public static function debug(string $message, array $context = []): void
    {
        self::getInstance()->debug($message, $context);
    }

    // Error-specific logging methods
    public static function logError(string $message, array $context = [], ?\Throwable $exception = null): void
    {
        if ($exception) {
            $context['exception'] = [
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTraceAsString()
            ];
        }

        self::getErrorLogger()->error($message, $context);
        // Also log to main logger for consistency
        self::getInstance()->error($message, $context);
    }

    public static function logCritical(string $message, array $context = [], ?\Throwable $exception = null): void
    {
        if ($exception) {
            $context['exception'] = [
                'message' => $exception->getMessage(),
                'file' => $exception->getFile(),
                'line' => $exception->getLine(),
                'trace' => $exception->getTraceAsString()
            ];
        }

        self::getErrorLogger()->critical($message, $context);
        self::getInstance()->critical($message, $context);
    }

    public static function logDatabaseError(string $query, array $bindings, \Throwable $exception): void
    {
        self::logError('Database query failed', [
            'query' => $query,
            'bindings' => $bindings,
            'error_code' => $exception->getCode()
        ], $exception);
    }

    public static function logApiError(string $endpoint, array $requestData, \Throwable $exception): void
    {
        self::logError('API request failed', [
            'endpoint' => $endpoint,
            'request_data' => self::sanitizeRequestData($requestData),
            'user_ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ], $exception);
    }

    private static function sanitizeRequestData(array $data): array
    {
        // Remove sensitive information from logs
        $sensitiveKeys = ['password', 'token', 'secret', 'key', 'credit_card', 'ssn'];

        $sanitized = [];
        foreach ($data as $key => $value) {
            if (in_array(strtolower($key), $sensitiveKeys)) {
                $sanitized[$key] = '***REDACTED***';
            } else {
                $sanitized[$key] = is_array($value) ? self::sanitizeRequestData($value) : $value;
            }
        }

        return $sanitized;
    }
}
