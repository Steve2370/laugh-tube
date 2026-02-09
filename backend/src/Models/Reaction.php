<?php

namespace App\Models;

use App\Interfaces\DatabaseInterface;
use Database;
use PDO;

class Reaction
{
    public function __construct(private DatabaseInterface $db) {}

    public function like(int $userId, int $videoId): bool
    {
        $sql = "INSERT INTO likes (user_id, video_id, created_at) 
                VALUES ($1, $2, NOW())
                ON CONFLICT (user_id, video_id) DO NOTHING";

        return $this->db->execute($sql, [$userId, $videoId]);
    }

    public function unlike(int $userId, int $videoId): bool
    {
        $sql = "DELETE FROM likes WHERE user_id = $1 AND video_id = $2";
        return $this->db->execute($sql, [$userId, $videoId]);
    }

    public function dislike(int $userId, int $videoId): bool
    {
        $sql = "INSERT INTO dislikes (user_id, video_id, created_at) 
                VALUES ($1, $2, NOW())
                ON CONFLICT (user_id, video_id) DO NOTHING";

        return $this->db->execute($sql, [$userId, $videoId]);
    }

    public function undislike(int $userId, int $videoId): bool
    {
        $sql = "DELETE FROM dislikes WHERE user_id = $1 AND video_id = $2";
        return $this->db->execute($sql, [$userId, $videoId]);
    }

    public function hasLiked(int $userId, int $videoId): bool
    {
        $sql = "SELECT 1 FROM likes WHERE user_id = $1 AND video_id = $2";
        $result = $this->db->fetchOne($sql, [$userId, $videoId]);
        return $result !== null;
    }

    public function hasDisliked(int $userId, int $videoId): bool
    {
        $sql = "SELECT 1 FROM dislikes WHERE user_id = $1 AND video_id = $2";
        $result = $this->db->fetchOne($sql, [$userId, $videoId]);
        return $result !== null;
    }

    public function countLikes(int $videoId): int
    {
        $sql = "SELECT COUNT(*) as count FROM likes WHERE video_id = $1";
        $result = $this->db->fetchOne($sql, [$videoId]);
        return $result ? (int)$result['count'] : 0;
    }

    public function countDislikes(int $videoId): int
    {
        $sql = "SELECT COUNT(*) as count FROM dislikes WHERE video_id = $1";
        $result = $this->db->fetchOne($sql, [$videoId]);
        return $result ? (int)$result['count'] : 0;
    }

    public function deleteByVideo(int $videoId): bool
    {
        try {
            $this->db->beginTransaction();

            $sql1 = "DELETE FROM likes WHERE video_id = $1";
            $this->db->execute($sql1, [$videoId]);

            $sql2 = "DELETE FROM dislikes WHERE video_id = $1";
            $this->db->execute($sql2, [$videoId]);

            $this->db->commit();
            return true;
        } catch (\Exception $e) {
            $this->db->rollback();
            error_log("Reaction::deleteByVideo error: " . $e->getMessage());
            return false;
        }
    }

    public function getUserReaction(int $userId, int $videoId): ?string
    {
        if ($this->hasLiked($userId, $videoId)) {
            return 'like';
        }
        if ($this->hasDisliked($userId, $videoId)) {
            return 'dislike';
        }
        return null;
    }

    public function toggleReaction(int $userId, int $videoId, string $type): bool
    {
        try {
            $this->db->beginTransaction();

            if ($type === 'like') {
                $this->undislike($userId, $videoId);
                $currentlyLiked = $this->hasLiked($userId, $videoId);
                $result = $currentlyLiked ? $this->unlike($userId, $videoId) : $this->like($userId, $videoId);
            } else {
                $this->unlike($userId, $videoId);
                $currentlyDisliked = $this->hasDisliked($userId, $videoId);
                $result = $currentlyDisliked ? $this->undislike($userId, $videoId) : $this->dislike($userId, $videoId);
            }

            $this->db->commit();
            return $result;
        } catch (\Exception $e) {
            $this->db->rollback();
            error_log("Reaction::toggleReaction error: " . $e->getMessage());
            return false;
        }
    }

    public function countUserLikes(int $userId)
    {
    }

    public function countUserDislikes(int $userId)
    {
    }

    public function getUserLikedVideos(int $userId, int $limit, int $offset)
    {
    }
}