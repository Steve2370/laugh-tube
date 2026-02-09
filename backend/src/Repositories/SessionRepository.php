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

        try {
            $result = $this->db->fetchOne($sql, [
                $sessionData['user_id'],
                $sessionData['token'],
                $sessionData['ip_address'],
                $sessionData['user_agent'],
                $sessionData['expires_at']
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

    public function updateActivity(string $token): bool {
        $sql = "UPDATE sessions 
                SET last_activity = NOW() 
                WHERE token = $1";
        return $this->db->execute($sql, [$token]);
    }

    public function invalidateSession(string $token): bool {
        $sql = "UPDATE sessions 
                SET is_active = FALSE 
                WHERE token = $1";
        return $this->db->execute($sql, [$token]);
    }

    public function invalidateAllUserSessions(int $userId): bool {
        $sql = "UPDATE sessions 
                SET is_active = FALSE 
                WHERE user_id = $1";
        return $this->db->execute($sql, [$userId]);
    }

    public function getUserActiveSessions(int $userId): array {
        $sql = "SELECT id, ip_address, user_agent, created_at, last_activity 
                FROM sessions 
                WHERE user_id = $1 
                AND is_active = TRUE 
                AND expires_at > NOW()
                ORDER BY last_activity DESC";

        return $this->db->fetchAll($sql, [$userId]);
    }

    public function deleteExpiredSessions(): int {
        $sql = "DELETE FROM sessions 
                WHERE expires_at < NOW() 
                OR last_activity < NOW() - INTERVAL '30 days'";

        $this->db->execute($sql);
        return 0;
    }

    public function findById(mixed $session_id)
    {
    }
}