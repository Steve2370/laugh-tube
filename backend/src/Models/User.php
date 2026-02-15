<?php

namespace App\Models;

use App\Interfaces\DatabaseInterface;

use PDO;

class User
{
    public function __construct(private DatabaseInterface $db) {}

    public function findByEmail(string $email): ?array
    {
        $sql = "SELECT id, username, email, password_hash, role, profile_image, email_verified, deleted_at, two_fa_enabled
            FROM users
            WHERE email = :email
            LIMIT 1";

        try {
            $pdo = $this->db->getConnection();
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':email' => $email]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            return $row ?: null;
        } catch (\Throwable $e) {
            error_log("findByEmail error: " . $e->getMessage());
            return null;
        }
    }


    public function findById(int $id): ?array
    {
        $sql = "SELECT id, username, email, password_hash, role, profile_image, profile_cover, bio, 
                       created_at, updated_at, email_verified, two_fa_enabled, deleted_at
                FROM users 
                WHERE id = $1 AND deleted_at IS NULL";

        return $this->db->fetchOne($sql, [$id]);
    }

    public function findByUsername(string $username): ?array
    {
        $sql = "SELECT id, username, email, password_hash, role, profile_image, profile_cover, bio, 
                       created_at, email_verified, two_fa_enabled
                FROM users 
                WHERE username = $1 AND deleted_at IS NULL";

        return $this->db->fetchOne($sql, [$username]);
    }

    public function updateAvatar(int $userId, string $filename): bool
    {
        try {
            $result = $this->db->query(
                "UPDATE users SET profile_image = $1 WHERE id = $2",
                [$filename, $userId]
            );
            return $result !== false;
        } catch (\Exception $e) {
            error_log("User::updateAvatar - Error: " . $e->getMessage());
            return false;
        }
    }

    public function updateCover(int $userId, string $filename): bool
    {
        try {
            $result = $this->db->query(
                "UPDATE users SET profile_cover = $1 WHERE id = $2",
                [$filename, $userId]
            );
            return $result !== false;
        } catch (\Exception $e) {
            error_log("User::updateCover - Error: " . $e->getMessage());
            return false;
        }
    }

    public function existsByEmailOrUsername(string $email, string $username): bool
    {
        $sql = "SELECT id FROM users 
                WHERE (email = $1 OR username = $2) AND deleted_at IS NULL";

        $result = $this->db->fetchOne($sql, [$email, $username]);
        return $result !== null;
    }

    public function emailExists(string $email, ?int $excludeUserId = null): bool
    {
        if ($excludeUserId) {
            $sql = "SELECT id FROM users WHERE email = $1 AND id != $2 AND deleted_at IS NULL";
            $result = $this->db->fetchOne($sql, [$email, $excludeUserId]);
        } else {
            $sql = "SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL";
            $result = $this->db->fetchOne($sql, [$email]);
        }

        return $result !== null;
    }

    public function usernameExists(string $username, ?int $excludeUserId = null): bool
    {
        if ($excludeUserId) {
            $sql = "SELECT id FROM users WHERE username = $1 AND id != $2 AND deleted_at IS NULL";
            $result = $this->db->fetchOne($sql, [$username, $excludeUserId]);
        } else {
            $sql = "SELECT id FROM users WHERE username = $1 AND deleted_at IS NULL";
            $result = $this->db->fetchOne($sql, [$username]);
        }

        return $result !== null;
    }

    public function create(string $username, string $email, string $passwordHash): ?int
    {
        $sql = "INSERT INTO users (username, email, password_hash, role, email_verified, created_at) 
                VALUES ($1, $2, $3, 'membre', FALSE, NOW())
                RETURNING id";

        try {
            $result = $this->db->fetchOne($sql, [$username, $email, $passwordHash]);
            return $result ? (int)$result['id'] : null;
        } catch (\Exception $e) {
            error_log("User::create error: " . $e->getMessage());
            return null;
        }
    }

    public function update(int $id, array $data): bool
    {
        $allowedFields = ['username', 'email', 'bio', 'profile_image', 'profile_cover'];
        $fields = [];
        $params = [];
        $index = 1;

        foreach ($data as $key => $value) {
            if (in_array($key, $allowedFields, true)) {
                $fields[] = "$key = $" . $index++;
                $params[] = $value;
            }
        }

        if (empty($fields)) {
            return false;
        }

        $params[] = $id;
        $sql = "UPDATE users SET " . implode(', ', $fields) .
            ", updated_at = NOW() WHERE id = $" . $index;

        return $this->db->execute($sql, $params);
    }

    public function updatePassword(int $id, string $newPasswordHash): bool
    {
        $sql = "UPDATE users 
                SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW() 
                WHERE id = $2";

        return $this->db->execute($sql, [$newPasswordHash, $id]);
    }

    public function updateProfileImage(int $id, string $imagePath): bool
    {
        $sql = "UPDATE users 
                SET profile_image = $1, updated_at = NOW() 
                WHERE id = $2";

        return $this->db->execute($sql, [$imagePath, $id]);
    }

    public function updateProfileCover(int $id, string $coverPath): bool
    {
        $sql = "UPDATE users 
                SET profile_cover = $1, updated_at = NOW() 
                WHERE id = $2";

        return $this->db->execute($sql, [$coverPath, $id]);
    }

    public function updateBio(int $id, string $bio): bool
    {
        $sql = "UPDATE users SET bio = $1, updated_at = NOW() WHERE id = $2";
        return $this->db->execute($sql, [$bio, $id]);
    }

    public function updateRole(int $id, string $role): bool
    {
        if (!in_array($role, ['admin', 'membre'], true)) {
            return false;
        }

        $sql = "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2";
        return $this->db->execute($sql, [$role, $id]);
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM users WHERE id = $1";
        return $this->db->execute($sql, [$id]);
    }

    public function findAll(int $limit = 50, int $offset = 0): array
    {
        $sql = "SELECT id, username, email, role, profile_image, profile_cover, bio, created_at
                FROM users 
                WHERE deleted_at IS NULL
                ORDER BY created_at DESC
                LIMIT $1 OFFSET $2";

        return $this->db->fetchAll($sql, [$limit, $offset]);
    }

    public function count(): int
    {
        $sql = "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL";
        $result = $this->db->fetchOne($sql);
        return $result ? (int)$result['count'] : 0;
    }

    public function recherche(string $term, int $limit = 20): array
    {
        $sql = "SELECT id, username, email, role, profile_image, profile_cover, created_at
                FROM users 
                WHERE (username ILIKE $1 OR email ILIKE $1) AND deleted_at IS NULL
                ORDER BY username
                LIMIT $2";

        return $this->db->fetchAll($sql, ["%$term%", $limit]);
    }

    public function getStats(int $userId): array
    {
        $sql = "SELECT
                    COUNT(DISTINCT v.id) AS total_videos,
                    COALESCE(SUM(v.views), 0) AS total_views,
                    COALESCE(SUM(v.unique_views), 0) AS total_unique_views,
                    COALESCE(SUM(v.total_watch_time), 0) AS total_watch_time,
                    (SELECT COUNT(*) FROM likes l JOIN videos v2 ON l.video_id = v2.id WHERE v2.user_id = $1) AS total_likes,
                    (SELECT COUNT(*) FROM dislikes d JOIN videos v3 ON d.video_id = v3.id WHERE v3.user_id = $1) AS total_dislikes,
                    (SELECT COUNT(*) FROM commentaires c JOIN videos v4 ON c.video_id = v4.id WHERE v4.user_id = $1) AS total_commentaires
                FROM videos v
                WHERE v.user_id = $1 AND v.encoded = TRUE";

        $stats = $this->db->fetchOne($sql, [$userId]);

        return [
            'total_videos' => (int)($stats['total_videos'] ?? 0),
            'total_views' => (int)($stats['total_views'] ?? 0),
            'total_unique_views' => (int)($stats['total_unique_views'] ?? 0),
            'total_watch_time' => (int)($stats['total_watch_time'] ?? 0),
            'total_likes' => (int)($stats['total_likes'] ?? 0),
            'total_dislikes' => (int)($stats['total_dislikes'] ?? 0),
            'total_commentaires' => (int)($stats['total_commentaires'] ?? 0)
        ];
    }

    public function getProfileImage(int $userId): ?string
    {
        $sql = "SELECT profile_image FROM users WHERE id = $1 AND deleted_at IS NULL";
        $result = $this->db->fetchOne($sql, [$userId]);
        return $result['profile_image'] ?? null;
    }

    public function getProfileCover(int $userId): ?string
    {
        $sql = "SELECT profile_cover FROM users WHERE id = $1 AND deleted_at IS NULL";
        $result = $this->db->fetchOne($sql, [$userId]);
        return $result['profile_cover'] ?? null;
    }

    public function markEmailAsVerified(mixed $id)
    {
    }

    public function findByEmailVerificationToken(string $token)
    {
    }

    public function saveEmailVerificationToken(int $userId, string $verificationToken)
    {
    }

    public function updateProfile(int $userId, mixed $username, mixed $email, mixed $bio)
    {
    }

    public function isSubscribed(int $subscriberId, int $targetUserId): bool
    {
        $stmt = $this->db->prepare("
            SELECT 1 FROM abonnements
            WHERE subscriber_id = :subscriber_id
            AND user_id = :user_id
            LIMIT 1
        ");

        $stmt->execute([
            'subscriber_id' => $subscriberId,
            'user_id' => $targetUserId
        ]);

        return (bool) $stmt->fetch();
    }

    public function subscribe(int $subscriberId, int $targetUserId): bool
    {
        $stmt = $this->db->prepare("
            INSERT INTO abonnements (subscriber_id, subscribed_to_id, created_at)
            VALUES (:subscriber_id, :user_id, NOW())
            ON CONFLICT DO NOTHING
        ");

        return $stmt->execute([
            'subscriber_id' => $subscriberId,
            'subscribed_to_id' => $targetUserId
        ]);
    }

    public function unsubscribe(int $subscriberId, int $targetUserId): bool
    {
        $stmt = $this->db->prepare("
            DELETE FROM abonnements
            WHERE subscriber_id = :subscriber_id
            AND user_id = :user_id
        ");

        return $stmt->execute([
            'subscriber_id' => $subscriberId,
            'user_id' => $targetUserId
        ]);
    }

    public function getSubscribersCount(int $userId): int
    {
        $stmt = $this->db->prepare("
            SELECT COUNT(*) as total
            FROM abonnements
            WHERE user_id = :user_id
        ");

        $stmt->execute(['user_id' => $userId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return (int) $result['total'];
    }
}