<?php

namespace App\Repositories;

use App\Interfaces\DatabaseInterface;

class SessionRepository {
    private DatabaseInterface $db;

    public function __construct(DatabaseInterface $db) {
        $this->db = $db;
    }

    public function createSession(array $sessionData): ?string {
        $sql = "INSERT INTO sessions (user_id, token, ip_address, user_agent, expires_at, created_at, last_activity)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            RETURNING token";

        $userId = $sessionData['user_id'] ?? $sessionData['userId'] ?? null;

        if (!$userId) {
            error_log("createSession missing user_id. Provided keys=" . implode(',', array_keys($sessionData)));
            return null;
        }

        try {
            $result = $this->db->fetchOne($sql, [
                (int)$userId,
                $sessionData['token'] ?? null,
                $sessionData['ip_address'] ?? null,
                $sessionData['user_agent'] ?? null,
                $sessionData['expires_at'] ?? null
            ]);

            return $result ? $result['token'] : null;
        } catch (\Exception $e) {
            error_log("Error creating session: " . $e->getMessage());
            return null;
        }
    }

    public function findByToken(string $token): ?array {
        $sql = "SELECT s.*, u.id as user_id, u.username, u.email, u.role, u.two_fa_enabled
                FROM sessions s
                JOIN users u ON s.user_id = u.id
                WHERE s.token = $1 
                AND s.is_active = TRUE 
                AND s.expires_at > NOW()
                AND u.deleted_at IS NULL";

        return $this->db->fetchOne($sql, [$token]);
    }

    public function invalidateAllUserSessions(int $userId): bool {
        $sql = "UPDATE sessions 
                SET is_active = FALSE 
                WHERE user_id = $1";
        return $this->db->execute($sql, [$userId]);
    }

    public function findById(mixed $session_id)
    {
    }
}