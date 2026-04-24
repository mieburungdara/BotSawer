<?php

declare(strict_types=1);

namespace VesperApp;

class RateLimiter
{
    private static $limits = [
        'auth.php' => ['max' => 100, 'window' => 3600], // 100 requests per hour
        'wallet.php' => ['max' => 100, 'window' => 3600], // 100 requests per hour
        'transactions.php' => ['max' => 100, 'window' => 3600], // 100 requests per hour
        'creator.php' => ['max' => 100, 'window' => 3600], // 100 requests per hour
        'admin.php' => ['max' => 200, 'window' => 3600], // 200 requests per hour
    ];

    public static function check(string $endpoint, string $identifier): bool
    {
        $key = "rate_limit:{$endpoint}:{$identifier}";
        $limit = self::$limits[$endpoint] ?? ['max' => 10, 'window' => 3600];

        // Simple in-memory rate limiting (for production, use Redis or database)
        $requests = $_SESSION[$key] ?? [];

        // Clean old requests
        $now = time();
        $requests = array_filter($requests, function($timestamp) use ($now, $limit) {
            return ($now - $timestamp) < $limit['window'];
        });

        // Check if under limit
        if (count($requests) >= $limit['max']) {
            return false;
        }

        // Add current request
        $requests[] = $now;
        $_SESSION[$key] = $requests;

        return true;
    }

    public static function getRemainingRequests(string $endpoint, string $identifier): int
    {
        $key = "rate_limit:{$endpoint}:{$identifier}";
        $limit = self::$limits[$endpoint] ?? ['max' => 10, 'window' => 3600];

        $requests = $_SESSION[$key] ?? [];
        $now = time();

        // Clean old requests
        $requests = array_filter($requests, function($timestamp) use ($now, $limit) {
            return ($now - $timestamp) < $limit['window'];
        });

        return max(0, $limit['max'] - count($requests));
    }
}
