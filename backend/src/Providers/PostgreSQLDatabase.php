<?php

namespace App\Providers;

use App\Interfaces\DatabaseInterface;

class PostgreSQLDatabase implements DatabaseInterface
{
    private $connection;
    private array $config;
    private ?string $lastError = null;

    public function __construct(array $config)
    {
        $this->config = $config;
    }

    public function connect(): bool
    {
        try {
            $connString = sprintf(
                "host=%s port=%d dbname=%s user=%s password=%s",
                $this->config['host'],
                $this->config['port'],
                $this->config['database'],
                $this->config['username'],
                $this->config['password']
            );

            $this->connection = pg_connect($connString);

            if (!$this->connection) {
                $this->lastError = "Failed to connect to database";
                return false;
            } pg_set_client_encoding($this->connection, $this->config['charset'] ?? 'UTF8');
            return true;
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            return false;
        }
    }

    public function query(string $sql, array $params = []): mixed
    {
        if (!$this->connection) {
            throw new \Exception("No database connection");
        }

        if (empty($params)) {
            return pg_query($this->connection, $sql);
        }

        $stmtName = 'stmt_' . md5($sql . microtime());
        $result = pg_prepare($this->connection, $stmtName, $sql);

        if (!$result) {
            $this->lastError = pg_last_error($this->connection);
            throw new \Exception("Failed to prepare statement: " . $this->lastError);
        }
        return $result;
    }

    public function execute(string $sql, array $params = []): bool
    {
        try {
            $result = $this->query($sql, $params);
            return $result !== false;
        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            return false;
        }
    }

    public function fetchOne(string $sql, array $params = []): ?array
    {
        $result = $this->query($sql, $params);

        if (!$result) {
            return null;
        }

        $row = pg_fetch_assoc($result);
        return $row ?: null;
    }

    public function fetchAll(string $sql, array $params = []): array
    {
        $result = $this->query($sql, $params);

        if (!$result) {
            return [];
        }

        return pg_fetch_all($result) ?: [];
    }

    public function lastInsertId(): int {
        $result = pg_query($this->connection, "SELECT lastval()");

        if (!$result) {
            return 0;
        }

        $row = pg_fetch_row($result);
        return (int)($row[0] ?? 0);
    }

    public function beginTransaction(): bool {
        return pg_query($this->connection, "BEGIN") !== false;
    }

    public function commit(): bool {
        return pg_query($this->connection, "COMMIT") !== false;
    }

    public function rollback(): bool {
        return pg_query($this->connection, "ROLLBACK") !== false;
    }

    public function disconnect(): void {
        if ($this->connection) {
            pg_close($this->connection);
            $this->connection = null;
        }
    }

    public function getLastError(): ?string {
        return $this->lastError;
    }

    public function getConnection() {
        return $this->connection;
    }
}