<?php

class Database
{
    private static $connection = null;

    public static function getConnection()
    {
        if (self::$connection === null) {
            try {
                $host = $_ENV['DB_HOST'] ?? 'postgres';
                $port = $_ENV['DB_PORT'] ?? '5432';
                $dbname = $_ENV['DB_NAME'] ?? 'laughtube';
                $username = $_ENV['DB_USER'] ?? 'laughtube_user';
                $password = $_ENV['DB_PASSWORD'] ?? 'changeme';
                $charset = 'UTF8';

                $dsn = "pgsql:host={$host};port={$port};dbname={$dbname}";

                self::$connection = new PDO(
                    $dsn,
                    $username,
                    $password,
                    [
                        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                        PDO::ATTR_EMULATE_PREPARES => false,
                    ]
                );

                error_log("Database connection successful to {$dbname}@{$host}");

            } catch (PDOException $e) {
                error_log("Database connection failed: " . $e->getMessage());
                throw new Exception("Database connection error: " . $e->getMessage());
            }
        }

        return self::$connection;
    }

    public static function getConfig()
    {
        return [
            'host' => $_ENV['DB_HOST'] ?? 'postgres',
            'port' => (int)($_ENV['DB_PORT'] ?? 5432),
            'database' => $_ENV['DB_NAME'] ?? 'laughtube',
            'username' => $_ENV['DB_USER'] ?? 'laughtube_user',
            'password' => $_ENV['DB_PASSWORD'] ?? 'changeme',
            'charset' => 'UTF8'
        ];
    }
}