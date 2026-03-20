<?php

namespace App\Models;

use App\Interfaces\DatabaseInterface;

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
}