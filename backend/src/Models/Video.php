<?php

namespace App\Models;

use App\Interfaces\DatabaseInterface;

class Video
{
    private DatabaseInterface $db;

    public function __construct(DatabaseInterface $db)
    {
        $this->db = $db;
    }

    public function create(int $userId, string $title, string $description, string $filename): ?int
    {
        try {
            $this->db->beginTransaction();

            error_log("Video::create - userId: $userId, title: $title, filename: $filename");

            $sql = "INSERT INTO videos (user_id, title, description, filename, created_at) 
                    VALUES ($1, $2, $3, $4, NOW()) 
                    RETURNING id";

            $result = $this->db->fetchOne($sql, [$userId, $title, $description, $filename]);

            if (!$result || !isset($result['id'])) {
                error_log("Video::create - No ID returned from INSERT");
                $this->db->rollback();
                return null;
            }

            $videoId = (int)$result['id'];
            error_log("Video::create - Created video ID: $videoId");

            if (!$this->addToEncodingQueue($videoId)) {
                error_log("Video::create - Failed to add to encoding queue");
                $this->db->rollback();
                return null;
            }

            $this->db->commit();
            return $videoId;

        } catch (\Exception $e) {
            $this->db->rollback();
            error_log("Video::create error: " . $e->getMessage());
            error_log("Video::create stack trace: " . $e->getTraceAsString());
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
        $sql = "SELECT v.*, u.username as auteur, u.avatar_url as auteur_image 
                FROM videos v 
                JOIN users u ON v.user_id = u.id 
                WHERE v.id = $1";

        return $this->db->fetchOne($sql, [$id]);
    }

    public function findAllPublic(): array
    {
        $sql = "SELECT v.id, v.title, v.description, v.filename, v.thumbnail, 
                       v.duration, v.views, v.unique_views, v.created_at, v.visibility, v.user_id, 
                       u.username AS auteur, u.avatar_url
                FROM videos v 
                JOIN users u ON v.user_id = u.id 
                WHERE v.visibility = 'publique' AND v.encoded = TRUE
                ORDER BY v.created_at DESC";

        return $this->db->fetchAll($sql);
    }

    public function delete(int $videoId): bool
    {
        $sql = "DELETE FROM videos WHERE id = $1";
        return $this->db->execute($sql, [$videoId]);
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
}