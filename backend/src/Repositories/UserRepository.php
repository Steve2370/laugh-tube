<?php

namespace App\Repositories;

use App\Interfaces\DatabaseInterface;

class UserRepository {
    private DatabaseInterface $db;

    public function __construct(DatabaseInterface $db) {
        $this->db = $db;
    }

    public function createUser(array $userData): ?int
    {
        $sql = "INSERT INTO users (
                username, email, password_hash, email_verified,
                verification_token, verification_token_expires,
                ip_registration, user_agent_registration, created_at
            ) VALUES (
                :username, :email, :password_hash, :email_verified,
                :verification_token, :verification_token_expires,
                :ip_registration, :user_agent_registration, NOW()
            )
            RETURNING id";

        $pdo = $this->db->getConnection();
        $emailVerified = (bool)($userData['email_verified'] ?? false);
        $stmt = $pdo->prepare($sql);

        $stmt->bindValue(':username', $userData['username'] ?? null, \PDO::PARAM_STR);
        $stmt->bindValue(':email', $userData['email'] ?? null, \PDO::PARAM_STR);
        $stmt->bindValue(':password_hash', $userData['password_hash'] ?? null, \PDO::PARAM_STR);
        $stmt->bindValue(':email_verified', $emailVerified, \PDO::PARAM_BOOL);
        $stmt->bindValue(':verification_token', $userData['verification_token'] ?? null, \PDO::PARAM_STR);
        $stmt->bindValue(':verification_token_expires', $userData['verification_token_expires'] ?? null, \PDO::PARAM_STR);
        $stmt->bindValue(':ip_registration', $userData['ip_registration'] ?? null, \PDO::PARAM_STR);
        $stmt->bindValue(':user_agent_registration', $userData['user_agent_registration'] ?? null, \PDO::PARAM_STR);

        try {
            $stmt->execute();
            $id = $stmt->fetchColumn();
            return $id !== false ? (int)$id : null;
        } catch (\Throwable $e) {
            error_log("Error creating user (PDO): " . $e->getMessage());
            return null;
        }
    }

    public function findById(int $id): ?array
    {
        $sql = "SELECT id, username, email, role, avatar_url, email_verified
            FROM users
            WHERE id = :id
            LIMIT 1";

        try {
            $pdo = $this->db->getConnection();
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':id' => $id]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            return $row ?: null;
        } catch (\Throwable $e) {
            error_log("findById error: " . $e->getMessage());
            return null;
        }
    }

    public function findByEmail(string $email): ?array
    {
        $sql = "SELECT id, username, email, password_hash, role, avatar_url, email_verified, deleted_at, two_fa_enabled,
                   failed_login_attempts, account_locked_until
            FROM users
            WHERE email = $1
            LIMIT 1";

        return $this->db->fetchOne($sql, [$email]);
    }

    public function findByUsername(string $username): ?array {
        $sql = "SELECT * FROM users WHERE username = $1 AND deleted_at IS NULL";
        return $this->db->fetchOne($sql, [$username]);
    }

    public function findByVerificationToken(string $token): ?array
    {
        $sql = "SELECT * FROM users
            WHERE verification_token = :token
              AND verification_token_expires > NOW()
              AND deleted_at IS NULL";

        return $this->db->fetchOne($sql, [
            ':token' => $token
        ]);
    }

    public function existsByEmailOrUsername(string $email, string $username): bool
    {
        $sql = "SELECT id FROM users 
                WHERE (email = $1 OR username = $2) AND deleted_at IS NULL";

        $result = $this->db->fetchOne($sql, [$email, $username]);
        return $result !== null;
    }

    public function updateEmailVerified(int $userId): bool {
        $sql = "UPDATE users 
                SET email_verified = TRUE, 
                    verification_token = NULL, 
                    verification_token_expires = NULL,
                    updated_at = NOW()
                WHERE id = $1";
        return $this->db->execute($sql, [$userId]);
    }

    public function updateLastLogin(int $userId): bool {
        $sql = "UPDATE users 
                SET last_login = NOW(), 
                    failed_login_attempts = 0,
                    account_locked_until = NULL,
                    updated_at = NOW()
                WHERE id = $1";
        return $this->db->execute($sql, [$userId]);
    }

    public function incrementFailedLogins(int $userId): bool {
        $sql = "UPDATE users 
                SET failed_login_attempts = failed_login_attempts + 1,
                    updated_at = NOW()
                WHERE id = $1";
        return $this->db->execute($sql, [$userId]);
    }

    public function lockAccount(int $userId, int $minutes): bool {
        $sql = "UPDATE users 
                SET account_locked_until = NOW() + ($1 || ' minutes')::INTERVAL,
                    updated_at = NOW()
                WHERE id = $2";
        return $this->db->execute($sql, [$minutes, $userId]);
    }

    public function softDelete(int $userId, ?string $reason = null): bool {
        $sql = "UPDATE users 
                SET deleted_at = NOW() + '30 days'::INTERVAL,
                    deletion_reason = $1,
                    updated_at = NOW()
                WHERE id = $2";
        return $this->db->execute($sql, [$reason, $userId]);
    }

    public function updatePassword(int $userId, string $hash): bool
    {
        try {
            $sql = "UPDATE users SET password_hash = $1 WHERE id = $2";
            $res = $this->db->execute($sql, [$hash, $userId]);

            if ($res === false) return false;
            if (is_int($res) && $res < 1) return false;

            return true;
        } catch (\Throwable $e) {
            error_log("UserModel::updatePassword - " . $e->getMessage());
            return false;
        }
    }

    public function saveEmailVerificationToken(int $userId, string $verificationToken): bool
    {
        $expires = date('Y-m-d H:i:s', time() + 3600);

        $sql = "UPDATE users
                SET verification_token = $1,
                    verification_token_expires = $2,
                    updated_at = NOW()
                WHERE id = $3";

        return $this->db->execute($sql, [$verificationToken, $expires, $userId]);
    }

    public function savePasswordResetToken(mixed $id, string $token, string $expires): void
    {
        $this->db->execute(
            "UPDATE users 
             SET password_reset_token = $1, password_reset_expires_at = $2, updated_at = NOW()
             WHERE id = $3",
            [$token, $expires, $id]
        );
    }

    public function findByPasswordResetToken(string $token): ?array
    {
        $user = $this->db->fetchOne(
            "SELECT id, username, email, password_reset_expires_at
             FROM users
             WHERE password_reset_token = $1 AND deleted_at IS NULL",
            [$token]
        );

        return $user ?: null;
    }

    public function clearPasswordResetToken(mixed $id): void
    {
        $this->db->execute(
            "UPDATE users 
             SET password_reset_token = NULL, password_reset_expires_at = NULL, updated_at = NOW()
             WHERE id = $1",
            [$id]
        );
    }

    public function saveVerificationToken(mixed $id, string $token): void
    {
        $this->db->execute(
            "UPDATE users 
             SET verification_token = $1, updated_at = NOW()
             WHERE id = $2",
            [$token, $id]
        );
    }
}
