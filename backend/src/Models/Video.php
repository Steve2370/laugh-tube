<?php

namespace App\Models;

use App\Interfaces\DatabaseInterface;
use Database;
use PDO;

class Video
{
    public function __construct(DatabaseInterface $db) {}

    public function create(int $userId, string $title, string $description, string $filename): ?int
    {
        try {
            $this->db->beginTransaction();

            $sql = "INSERT INTO videos (user_id, title, description, filename, created_at) 
                    VALUES ($1, $2, $3, $4, NOW()) 
                    RETURNING id";

            $result = $this->db->fetchOne($sql, [$userId, $title, $description, $filename]);

            if (!$result) {
                $this->db->rollback();
                return null;
            }

            $videoId = (int)$result['id'];
            $this->addToEncodingQueue($videoId);

            $this->db->commit();
            return $videoId;

        } catch (\Exception $e) {
            $this->db->rollback();
            error_log("Video::create error: " . $e->getMessage());
            return null;
        }
    }

    public function addToEncodingQueue(int $videoId): bool
    {
        $sql = "INSERT INTO encoding_queue (video_id, status, created_at)
                VALUES ($1, 'pending', NOW())";

        return $this->db->execute($sql, [$videoId]);
    }

    public function findById(int $id): ?array
    {
        $sql = "SELECT v.*, u.username as auteur, u.profile_image as auteur_image 
                FROM videos v 
                JOIN users u ON v.user_id = u.id 
                WHERE v.id = $1";

        return $this->db->fetchOne($sql, [$id]);
    }

    public function findAllPublic(): array
    {
        $sql = "SELECT v.id, v.title, v.description, v.filename, v.thumbnail, 
                       v.duration, v.views, v.unique_views, v.created_at, v.visibility, v.user_id, 
                       u.username AS auteur, u.profile_image
                FROM videos v 
                JOIN users u ON v.user_id = u.id 
                WHERE v.visibility = 'publique' AND v.encoded = TRUE
                ORDER BY v.created_at DESC";

        return $this->db->fetchAll($sql);
    }

    public function findByUser(int $userId): array
    {
        $sql = "SELECT v.id, v.title, v.filename, v.views, v.unique_views, v.created_at, v.visibility,
                       (SELECT COUNT(*) FROM likes l WHERE l.video_id = v.id) AS likes,
                       (SELECT COUNT(*) FROM dislikes d WHERE d.video_id = v.id) AS dislikes,
                       (SELECT COUNT(*) FROM commentaires c WHERE c.video_id = v.id) AS comments
                FROM videos v
                WHERE v.user_id = $1
                ORDER BY v.created_at DESC";

        return $this->db->fetchAll($sql, [$userId]);
    }

    public function delete(int $videoId): bool
    {
        $sql = "DELETE FROM videos WHERE id = $1";
        return $this->db->execute($sql, [$videoId]);
    }

    public function proprietaire(int $videoId): ?int
    {
        $sql = "SELECT user_id FROM videos WHERE id = $1";
        $result = $this->db->fetchOne($sql, [$videoId]);
        return $result ? (int)$result['user_id'] : null;
    }

    public function exists(int $videoId, bool $publicOnly = false): bool
    {
        if ($publicOnly) {
            $sql = "SELECT id FROM videos WHERE id = $1 AND encoded = TRUE AND visibility = 'publique'";
        } else {
            $sql = "SELECT id FROM videos WHERE id = $1";
        }

        $result = $this->db->fetchOne($sql, [$videoId]);
        return $result !== null;
    }

    public function getFilename(int $videoId): ?string
    {
        $sql = "SELECT filename FROM videos WHERE id = $1 AND encoded = TRUE";
        $result = $this->db->fetchOne($sql, [$videoId]);
        return $result['filename'] ?? null;
    }

    public function getThumbnail(int $videoId): ?string
    {
        $sql = "SELECT thumbnail FROM videos 
                WHERE id = $1 AND encoded = TRUE AND visibility = 'publique'";
        $result = $this->db->fetchOne($sql, [$videoId]);
        return $result['thumbnail'] ?? null;
    }

    public function getMetadata(int $videoId): ?array
    {
        $sql = "SELECT filename, thumbnail, user_id FROM videos WHERE id = $1";
        return $this->db->fetchOne($sql, [$videoId]);
    }

    public function incrementViews(int $videoId): bool
    {
        $sql = "UPDATE videos 
                SET views = views + 1, unique_views = unique_views + 1
                WHERE id = $1";

        return $this->db->execute($sql, [$videoId]);
    }

    public function getViews(int $videoId): array
    {
        $sql = "SELECT views, unique_views FROM videos WHERE id = $1";
        $result = $this->db->fetchOne($sql, [$videoId]);

        return [
            'views' => (int)($result['views'] ?? 0),
            'unique_views' => (int)($result['unique_views'] ?? 0)
        ];
    }
}