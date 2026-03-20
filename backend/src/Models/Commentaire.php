<?php

namespace App\Models;

use App\Interfaces\DatabaseInterface;


class Commentaire
{
    public function __construct(private DatabaseInterface $db) {}

    public function create(int $userId, int $videoId, string $content): ?int
    {
        $sql = "INSERT INTO commentaires (user_id, video_id, content, created_at) 
                VALUES ($1, $2, $3, NOW()) 
                RETURNING id";

        try {
            $result = $this->db->fetchOne($sql, [$userId, $videoId, $content]);
            return $result ? (int)$result['id'] : null;
        } catch (\Exception $e) {
            error_log("Commentaire::create error: " . $e->getMessage());
            return null;
        }
    }

    public function findByVideo(int $videoId): array
    {
        $sql = "SELECT c.id, c.content, c.created_at, c.user_id,
                       u.username, u.avatar_url
                FROM commentaires c
                JOIN users u ON c.user_id = u.id
                WHERE c.video_id = $1
                ORDER BY c.created_at DESC";

        return $this->db->fetchAll($sql, [$videoId]);
    }

    public function countByVideo(int $videoId): int
    {
        $sql = "SELECT COUNT(*) as count FROM commentaires WHERE video_id = $1";
        $result = $this->db->fetchOne($sql, [$videoId]);
        return $result ? (int)$result['count'] : 0;
    }

    public function findById(int $id): ?array
    {
        $sql = "SELECT c.*, u.username, u.avatar_url
                FROM commentaires c
                JOIN users u ON c.user_id = u.id
                WHERE c.id = $1";

        return $this->db->fetchOne($sql, [$id]);
    }

    public function delete(int $id): bool
    {
        $sql = "DELETE FROM commentaires WHERE id = $1";
        return $this->db->execute($sql, [$id]);
    }
}