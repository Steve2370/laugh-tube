<?php

namespace App\Models;

use App\Interfaces\DatabaseInterface;
use PDO;

class Notification
{
    public function __construct(private DatabaseInterface $db) {}

    public function create(array $data): ?int
    {
        $sql = "INSERT INTO notifications (
                    user_id, 
                    actor_id, 
                    type, 
                    video_id, 
                    comment_id,
                    message,
                    is_read,
                    created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, FALSE, NOW())
                RETURNING id";

        try {
            $result = $this->db->fetchOne($sql, [
                $data['user_id'],
                $data['actor_id'] ?? null,
                $data['type'],
                $data['video_id'] ?? null,
                $data['comment_id'] ?? null,
                $data['message'] ?? null
            ]);

            return $result ? (int)$result['id'] : null;
        } catch (\Exception $e) {
            error_log("Notification::create error: " . $e->getMessage());
            return null;
        }
    }

    public function getUserNotifications(int $userId, int $limit = 20, int $offset = 0): array
    {
        $sql = "SELECT 
                    n.*,
                    u.username as actor_name,
                    u.avatar_url as actor_image,
                    v.title as video_title,
                    v.thumbnail as video_thumbnail,
                    c.content as comment_preview
                FROM notifications n
                LEFT JOIN users u ON u.id = n.actor_id
                LEFT JOIN videos v ON v.id = n.video_id
                LEFT JOIN commentaires c ON c.id = n.comment_id
                WHERE n.user_id = $1
                ORDER BY n.created_at DESC
                LIMIT $2 OFFSET $3";

        $notifications = $this->db->fetchAll($sql, [$userId, $limit, $offset]);

        foreach ($notifications as &$notification) {
            if ($notification['comment_preview'] && strlen($notification['comment_preview']) > 100) {
                $notification['comment_preview'] = substr($notification['comment_preview'], 0, 100) . '...';
            }
        }

        return $notifications;
    }

    public function getUnreadCount(int $userId): int
    {
        $sql = "SELECT COUNT(*) as count 
                FROM notifications 
                WHERE user_id = $1 AND is_read = FALSE";

        $result = $this->db->fetchOne($sql, [$userId]);
        return $result ? (int)$result['count'] : 0;
    }

    public function markAsRead(int $notificationId, int $userId): bool
    {
        $sql = "UPDATE notifications 
                SET is_read = TRUE, read_at = NOW()
                WHERE id = $1 AND user_id = $2";

        return $this->db->execute($sql, [$notificationId, $userId]);
    }

    public function markAllAsRead(int $userId): bool
    {
        $sql = "UPDATE notifications 
                SET is_read = TRUE, read_at = NOW()
                WHERE user_id = $1 AND is_read = FALSE";

        return $this->db->execute($sql, [$userId]);
    }

    public function delete(int $notificationId, int $userId): bool
    {
        $sql = "DELETE FROM notifications 
                WHERE id = $1 AND user_id = $2";

        return $this->db->execute($sql, [$notificationId, $userId]);
    }

    public function deleteOldNotifications(): bool
    {
        $sql = "DELETE FROM notifications 
                WHERE created_at < NOW() - INTERVAL '30 days'";

        return $this->db->execute($sql);
    }

    public function notificationExists(
        int $userId,
        string $type,
        ?int $videoId = null,
        ?int $actorId = null
    ): bool {
        if ($videoId !== null) {
            $sql = "SELECT 1 FROM notifications 
                    WHERE user_id = $1 
                    AND type = $2 
                    AND actor_id = $3
                    AND video_id = $4
                    AND created_at > NOW() - INTERVAL '1 hour'";

            $result = $this->db->fetchOne($sql, [$userId, $type, $actorId, $videoId]);
        } else {
            $sql = "SELECT 1 FROM notifications 
                    WHERE user_id = $1 
                    AND type = $2 
                    AND actor_id = $3
                    AND created_at > NOW() - INTERVAL '1 hour'";

            $result = $this->db->fetchOne($sql, [$userId, $type, $actorId]);
        }

        return $result !== null;
    }

    public function deleteByUser(int $userId): bool
    {
        $sql = "DELETE FROM notifications WHERE user_id = $1";
        return $this->db->execute($sql, [$userId]);
    }

    public function deleteByVideo(int $videoId): bool
    {
        $sql = "DELETE FROM notifications WHERE video_id = $1";
        return $this->db->execute($sql, [$videoId]);
    }

    public function getTypeStats(int $userId)
    {
    }

    public function deleteAllForUser(int $userId)
    {
    }
}