<?php
namespace App\Models;

use App\Interfaces\DatabaseInterface;

class VideoView
{
    public function __construct(private DatabaseInterface $db) {}

    public function getUserWatchHistory(int $userId, int $limit = 20, int $offset = 0): array
    {
        $sql = "SELECT 
                    v.id, v.title, v.thumbnail, v.duration,
                    vw.viewed_at, vw.watch_time, vw.watch_percentage, vw.completed
                FROM video_views vw
                JOIN videos v ON vw.video_id = v.id
                WHERE vw.user_id = $1
                ORDER BY vw.viewed_at DESC
                LIMIT $2 OFFSET $3";

        return $this->db->fetchAll($sql, [$userId, $limit, $offset]);
    }
}