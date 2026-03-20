<?php

namespace App\Providers;

use App\Interfaces\DatabaseInterface;
use PDO;
use PDOException;

class PostgreSQLDatabase implements DatabaseInterface
{
    private ?PDO $connection = null;
    private array $config;
    private ?string $lastError = null;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function connect(): bool
    {
        try {
            $dsn = sprintf(
                "pgsql:host=%s;port=%d;dbname=%s",
                $this->config['host'],
                $this->config['port'],
                $this->config['database']
            );

            $this->connection = new PDO(
                $dsn,
                $this->config['username'],
                $this->config['password'],
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );

            return true;
        } catch (PDOException $e) {
            $this->lastError = $e->getMessage();
            error_log("Database connection error: " . $e->getMessage());
            return false;
        }
    }

    private function convertPostgreSQLPlaceholders(string $sql, array $params): array
    {
        if (preg_match('/\$\d+/', $sql)) {
            preg_match_all('/\$(\d+)/', $sql, $matches);

            if (!empty($matches[1])) {
                $convertedSql = preg_replace('/\$\d+/', '?', $sql);

                $reorderedParams = array_values($params);

                return [$convertedSql, $reorderedParams];
            }
        }

        return [$sql, $params];
    }

    public function query(string $sql, array $params = []): mixed
    {
        if (!$this->connection) {
            throw new \Exception("No database connection");
        }

        try {
            [$convertedSql, $convertedParams] = $this->convertPostgreSQLPlaceholders($sql, $params);

            error_log("PostgreSQLDatabase::query - Original SQL: " . substr($sql, 0, 100));
            error_log("PostgreSQLDatabase::query - Converted SQL: " . substr($convertedSql, 0, 100));
            error_log("PostgreSQLDatabase::query - Params: " . json_encode($convertedParams));

            $stmt = $this->connection->prepare($convertedSql);
            $stmt->execute($convertedParams);
            return $stmt;
        } catch (PDOException $e) {
            $this->lastError = $e->getMessage();
            error_log("PostgreSQLDatabase::query - Error: " . $e->getMessage());
            error_log("PostgreSQLDatabase::query - SQL: " . $sql);
            error_log("PostgreSQLDatabase::query - Params: " . json_encode($params));
            throw new \Exception("Query failed: " . $e->getMessage());
        }
    }

    public function execute(string $sql, array $params = []): bool
    {
        try {
            $stmt = $this->query($sql, $params);
            return $stmt !== false;
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            return false;
        }
    }

    public function fetchOne(string $sql, array $params = []): ?array
    {
        try {
            $stmt = $this->query($sql, $params);
            $result = $stmt->fetch();
            return $result ?: null;
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            return null;
        }
    }

    public function fetchAll(string $sql, array $params = []): array
    {
        try {
            $stmt = $this->query($sql, $params);
            return $stmt->fetchAll();
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            return [];
        }
    }

    public function lastInsertId(): int
    {
        try {
            return (int) $this->connection->lastInsertId();
        } catch (PDOException $e) {
            $this->lastError = $e->getMessage();
            return 0;
        }
    }

    public function beginTransaction(): bool
    {
        try {
            return $this->connection->beginTransaction();
        } catch (PDOException $e) {
            $this->lastError = $e->getMessage();
            return false;
        }
    }

    public function commit(): bool
    {
        try {
            return $this->connection->commit();
        } catch (PDOException $e) {
            $this->lastError = $e->getMessage();
            return false;
        }
    }

    public function rollback(): bool
    {
        try {
            return $this->connection->rollBack();
        } catch (PDOException $e) {
            $this->lastError = $e->getMessage();
            return false;
        }
    }

    public function disconnect(): void
    {
        $this->connection = null;
    }

    public function getConnection(): ?PDO
    {
        return $this->connection;
    }
}