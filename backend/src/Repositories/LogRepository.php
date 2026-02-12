<?php

namespace App\Repositories;

use App\Interfaces\DatabaseInterface;

class LogRepository {
    private DatabaseInterface $db;

    public function __construct(DatabaseInterface $db) {
        $this->db = $db;
    }

    public function logSecurityEvent(array $logData): bool
    {
        $sql = "INSERT INTO security_logs (user_id, event_type, description, ip_address, user_agent, additional_data, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, NOW())";

        $eventType = $logData['event_type'] ?? $logData['eventType'] ?? null;
        $userId    = $logData['user_id'] ?? $logData['userId'] ?? null;

        if (!$eventType) {
            error_log("logSecurityEvent missing event_type. Provided keys=" . implode(',', array_keys($logData)));
            return false;
        }

        try {
            return $this->db->execute($sql, [
                $userId ? (int)$userId : null,
                (string)$eventType,
                $logData['description'] ?? null,
                $logData['ip_address'] ?? null,
                $logData['user_agent'] ?? null,
                $logData['additional_data'] ?? null
            ]);
        } catch (\Exception $e) {
            error_log("Error logging security event: " . $e->getMessage());
            return false;
        }
    }

    public function logEmail(array $emailData): ?int
    {
        $sql = "INSERT INTO email_logs (user_id, email_type, recipient, subject, body, status, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
            RETURNING id";

        $userId = $emailData['user_id'] ?? $emailData['userId'] ?? null;
        $emailType = $emailData['email_type'] ?? $emailData['emailType'] ?? $emailData['type'] ?? null;

        if (!$emailType) {
            error_log("logEmail missing email_type. Provided keys=" . implode(',', array_keys($emailData)));
            $emailType = 'unknown';
        }

        $recipient = $emailData['recipient'] ?? $emailData['to'] ?? null;
        $subject   = $emailData['subject'] ?? null;

        if (!$recipient || !$subject) {
            error_log("logEmail missing recipient/subject. keys=" . implode(',', array_keys($emailData)));
            return null;
        }

        try {
            $result = $this->db->fetchOne($sql, [
                $userId ? (int)$userId : null,
                (string)$emailType,
                (string)$recipient,
                (string)$subject,
                $emailData['body'] ?? null,
                $emailData['status'] ?? 'pending'
            ]);

            return $result ? (int)$result['id'] : null;
        } catch (\Exception $e) {
            error_log("Error logging email: " . $e->getMessage());
            return null;
        }
    }

    public function updateEmailStatus(int $emailId, string $status, ?string $error = null): bool {
        $sql = "UPDATE email_logs 
                SET status = $1, error = $2, sent_at = CASE WHEN $1 = 'sent' THEN NOW() ELSE sent_at END 
                WHERE id = $3";

        return $this->db->execute($sql, [$status, $error, $emailId]);
    }

    public function logLoginAttempt(string $email, string $ipAddress, bool $success): bool {
        $sql = "INSERT INTO login_attempts (email, ip_address, success, attempted_at) 
                VALUES ($1, $2, $3, NOW())";

        return $this->db->execute($sql, [$email, $ipAddress, $success]);
    }

    public function getRecentLoginAttempts(string $email, string $ipAddress, int $minutes = 15): int {
        $sql = "SELECT COUNT(*) as count 
                FROM login_attempts 
                WHERE (email = $1 OR ip_address = $2)
                AND success = FALSE 
                AND attempted_at > NOW() - ($3 || ' minutes')::INTERVAL";

        $result = $this->db->fetchOne($sql, [$email, $ipAddress, $minutes]);
        return $result ? (int)$result['count'] : 0;
    }

    public function getUserSecurityLogs(int $userId, int $limit = 50): array {
        $sql = "SELECT event_type, description, ip_address, created_at 
                FROM security_logs 
                WHERE user_id = $1 
                ORDER BY created_at DESC 
                LIMIT $2";

        return $this->db->fetchAll($sql, [$userId, $limit]);
    }
}