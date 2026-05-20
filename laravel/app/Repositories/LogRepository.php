<?php

namespace App\Repositories;

use App\Interfaces\DatabaseInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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

    public function logEmail(array $data): ?int
    {
        try {
            return DB::table('email_logs')->insertGetId([
                'user_id' => $data['user_id'] ?? null,
                'email_type' => $data['email_type'] ?? null,
                'recipient' => $data['recipient'] ?? null,
                'subject' => $data['subject'] ?? null,
                'body' => $data['body'] ?? null,
                'status' => $data['status'] ?? 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::warning('logEmail failed: ' . $e->getMessage());
            return null;
        }
    }

    public function updateEmailStatus(int $id, string $status, ?string $error = null): void
    {
        try {
            DB::table('email_logs')->where('id', $id)->update([
                'status' => $status,
                'error' => $error,
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::warning('updateEmailStatus failed: ' . $e->getMessage());
        }
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
}
