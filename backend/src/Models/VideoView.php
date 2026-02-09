<?php
namespace App\Models;

use App\Interfaces\DatabaseInterface;
use PDO;

class VideoView
{
    public function __construct(private DatabaseInterface $db) {}

    public function record(int $videoId, ?int $userId, ?string $sessionId, array $data): ?int
    {
        $sql = "INSERT INTO video_views (
                    video_id, user_id, session_id, ip_address, user_agent, 
                    watch_time, watch_percentage, completed, viewed_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                RETURNING id";

        try {
            $result = $this->db->fetchOne($sql, [
                $videoId,
                $userId,
                $sessionId,
                $data['ip_address'] ?? null,
                $data['user_agent'] ?? null,
                $data['watch_time'] ?? 0,
                $data['watch_percentage'] ?? 0.0,
                filter_var($data['completed'] ?? false, FILTER_VALIDATE_BOOLEAN)
            ]);

            return $result ? (int)$result['id'] : null;
        } catch (\Exception $e) {
            error_log("VideoView::record error: " . $e->getMessage());
            return null;
        }
    }

    public function hasViewed(int $videoId, ?int $userId, ?string $sessionId): bool
    {
        if ($userId) {
            $sql = "SELECT 1 FROM video_views WHERE video_id = $1 AND user_id = $2";
            $result = $this->db->fetchOne($sql, [$videoId, $userId]);
        } else {
            $sql = "SELECT 1 FROM video_views WHERE video_id = $1 AND session_id = $2";
            $result = $this->db->fetchOne($sql, [$videoId, $sessionId]);
        }

        return $result !== null;
    }

    public function getViewCounts(int $videoId): array
    {
        $sql = "SELECT views, unique_views FROM videos WHERE id = $1";
        $result = $this->db->fetchOne($sql, [$videoId]) ?? [];

        return [
            'views' => (int)($result['views'] ?? 0),
            'unique_views' => (int)($result['unique_views'] ?? 0)
        ];
    }

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

    public function cleanupOldSessions(): bool
    {
        $sql = "SELECT cleanup_old_anonymous_sessions()";

        try {
            $this->db->execute($sql);
            return true;
        } catch (\Exception $e) {
            error_log("VideoView::cleanupOldSessions error: " . $e->getMessage());
            return false;
        }
    }

    public function createAnonymousSession(string $sessionId, array $data): bool
    {
        $sql = "INSERT INTO session_anonymes (session_id, ip_address, user_agent, last_activity) 
                VALUES ($1, $2, $3, NOW())
                ON CONFLICT (session_id) 
                DO UPDATE SET last_activity = NOW()";

        return $this->db->execute($sql, [
            $sessionId,
            $data['ip_address'] ?? null,
            $data['user_agent'] ?? null
        ]);
    }

    public function updateView(int $videoId, ?int $userId, ?string $sessionId, array $data): bool
    {
        if ($userId) {
            $sql = "UPDATE video_views 
                    SET watch_time = GREATEST(watch_time, $1),
                        watch_percentage = GREATEST(watch_percentage, $2),
                        completed = completed OR $3
                    WHERE video_id = $4 AND user_id = $5";

            return $this->db->execute($sql, [
                $data['watch_time'],
                $data['watch_percentage'],
                $data['completed'],
                $videoId,
                $userId
            ]);
        } else {
            $sql = "UPDATE video_views 
                    SET watch_time = GREATEST(watch_time, $1),
                        watch_percentage = GREATEST(watch_percentage, $2),
                        completed = completed OR $3
                    WHERE video_id = $4 AND session_id = $5";

            return $this->db->execute($sql, [
                $data['watch_time'],
                $data['watch_percentage'],
                $data['completed'],
                $videoId,
                $sessionId
            ]);
        }
    }

    public function getWatchStats(int $videoId): array
    {
        $sql = "SELECT 
                    COUNT(*) as total_views,
                    AVG(watch_percentage) as avg_watch_percentage,
                    COUNT(CASE WHEN completed = TRUE THEN 1 END) as completed_views,
                    AVG(watch_time) as avg_watch_time
                FROM video_views
                WHERE video_id = $1";

        $result = $this->db->fetchOne($sql, [$videoId]) ?? [];

        return [
            'total_views' => (int)($result['total_views'] ?? 0),
            'avg_watch_percentage' => round((float)($result['avg_watch_percentage'] ?? 0), 2),
            'completed_views' => (int)($result['completed_views'] ?? 0),
            'avg_watch_time' => (int)($result['avg_watch_time'] ?? 0)
        ];
    }
}