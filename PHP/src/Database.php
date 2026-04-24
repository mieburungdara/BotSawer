<?php

declare(strict_types=1);

namespace VesperApp;

use Illuminate\Database\Capsule\Manager as Capsule;
use Dotenv\Dotenv;
use Throwable;

class Database
{
    private static ?Capsule $capsule = null;

    public static function init(): void
    {
        if (self::$capsule === null) {
            try {
                $dotenv = Dotenv::createImmutable(dirname(__DIR__));
                $dotenv->load();

                Logger::info('Initializing database connection', [
                    'host' => $_ENV['DB_HOST'] ?? 'unknown',
                    'database' => $_ENV['DB_NAME'] ?? 'unknown'
                ]);

                self::$capsule = new Capsule();

                self::$capsule->addConnection([
                    'driver'    => 'mysql',
                    'host'      => $_ENV['DB_HOST'],
                    'database'  => $_ENV['DB_NAME'],
                    'username'  => $_ENV['DB_USER'],
                    'password'  => $_ENV['DB_PASSWORD'],
                    'charset'   => $_ENV['DB_CHARSET'],
                    'collation' => 'utf8mb4_unicode_ci',
                    'prefix'    => '',
                    'engine'    => 'InnoDB',
                    'options'   => [
                        \PDO::ATTR_EMULATE_PREPARES => false,
                        \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION,
                        \PDO::MYSQL_ATTR_INIT_COMMAND => "SET SESSION sql_mode = 'STRICT_ALL_TABLES'"
                    ]
                ]);

                self::$capsule->setAsGlobal();
                self::$capsule->bootEloquent();

                Logger::info('Database connection initialized successfully');
            } catch (Throwable $e) {
                Logger::logCritical('Failed to initialize database connection', [
                    'db_host' => $_ENV['DB_HOST'] ?? 'unknown',
                    'db_name' => $_ENV['DB_NAME'] ?? 'unknown'
                ], $e);
                throw $e;
            }
        }
    }

    public static function transaction(callable $callback): mixed
    {
        try {
            Logger::debug('Starting database transaction');
            $result = Capsule::transaction($callback);
            Logger::debug('Database transaction completed successfully');
            return $result;
        } catch (Throwable $e) {
            Logger::logDatabaseError('transaction', [], $e);
            throw $e;
        }
    }

    public static function getCapsule(): Capsule
    {
        return self::$capsule;
    }
}
