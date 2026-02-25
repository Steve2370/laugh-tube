<?php

namespace App\Interfaces;

interface DatabaseInterface
{
    public function connect(): bool;
    public function query(string $sql, array $params = []): mixed;
    public function execute(string $sql, array $params = []): bool;
    public function fetchOne(string $sql, array $params = []): ?array;
    public function fetchAll(string $sql, array $params = []): array;
    public function lastInsertId(): int;
    public function beginTransaction(): bool;
    public function commit(): bool;
    public function rollback(): bool;
    public function disconnect(): void;
}