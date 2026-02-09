<?php

namespace App\Services;

use App\Interfaces\DatabaseInterface;
use App\Models\User;
use Database;
use PDO;

class NotificationCreationService
{
    public function __construct(
        private DatabaseInterface $db,
        private User $userModel
    ) {}

    public function createNotification(
        int $userId,
        ?int $actorId,
        string $type,
        ?int $videoId = null,
        ?int $commentId = null,
        ?string $message = null,
        ?string $actorName = null,
        ?string $videoTitle = null,
        ?string $commentPreview = null
    ): bool {
        if ($actorId && $actorId === $userId) {
            return false;
        }

        try {
            $sql = "INSERT INTO notifications 
                    (user_id, actor_id, type, video_id, comment_id, message, actor_name, video_title, comment_preview)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)";

            $this->db->execute($sql, [
                $userId,
                $actorId,
                $type,
                $videoId,
                $commentId,
                $message,
                $actorName,
                $videoTitle,
                $commentPreview
            ]);

            return true;

        } catch (\Exception $e) {
            error_log("NotificationCreationService::createNotification - Error: " . $e->getMessage());
            return false;
        }
    }

    public function notifyVideoLike(int $videoId, int $actorId, string $actorName): bool
    {
        try {
            $video = $this->db->fetchOne(
                "SELECT user_id, title FROM videos WHERE id = $1",
                [$videoId]
            );

            if (!$video) {
                return false;
            }

            return $this->createNotification(
                userId: (int)$video['user_id'],
                actorId: $actorId,
                type: 'like',
                videoId: $videoId,
                actorName: $actorName,
                videoTitle: $video['title']
            );

        } catch (\Exception $e) {
            error_log("NotificationCreationService::notifyVideoLike - Error: " . $e->getMessage());
            return false;
        }
    }

    public function notifyVideoComment(int $videoId, int $actorId, string $actorName, string $commentContent): bool
    {
        try {
            $video = $this->db->fetchOne(
                "SELECT user_id, title FROM videos WHERE id = $1",
                [$videoId]
            );

            if (!$video) {
                return false;
            }

            $preview = mb_strlen($commentContent) > 50
                ? mb_substr($commentContent, 0, 50) . '...'
                : $commentContent;

            return $this->createNotification(
                userId: (int)$video['user_id'],
                actorId: $actorId,
                type: 'comment',
                videoId: $videoId,
                actorName: $actorName,
                videoTitle: $video['title'],
                commentPreview: $preview
            );

        } catch (\Exception $e) {
            error_log("NotificationCreationService::notifyVideoComment - Error: " . $e->getMessage());
            return false;
        }
    }

    public function notifyCommentReply(int $commentId, int $actorId, string $actorName, string $replyContent): bool
    {
        try {
            $comment = $this->db->fetchOne(
                "SELECT c.user_id, c.video_id, v.title 
                 FROM commentaires c
                 JOIN videos v ON c.video_id = v.id
                 WHERE c.id = $1",
                [$commentId]
            );

            if (!$comment) {
                return false;
            }

            $preview = mb_strlen($replyContent) > 50
                ? mb_substr($replyContent, 0, 50) . '...'
                : $replyContent;

            return $this->createNotification(
                userId: (int)$comment['user_id'],
                actorId: $actorId,
                type: 'reply',
                videoId: (int)$comment['video_id'],
                commentId: $commentId,
                actorName: $actorName,
                videoTitle: $comment['title'],
                commentPreview: $preview
            );

        } catch (\Exception $e) {
            error_log("NotificationCreationService::notifyCommentReply - Error: " . $e->getMessage());
            return false;
        }
    }

    public function notifySubscribe(int $creatorId, int $subscriberId, string $subscriberName): bool
    {
        try {
            return $this->createNotification(
                userId: $creatorId,
                actorId: $subscriberId,
                type: 'subscribe',
                actorName: $subscriberName
            );

        } catch (\Exception $e) {
            error_log("NotificationCreationService::notifySubscribe - Error: " . $e->getMessage());
            return false;
        }
    }

    public function notifyCommentLike(int $commentId, int $actorId, string $actorName): bool
    {
        try {
            $comment = $this->db->fetchOne(
                "SELECT c.user_id, c.video_id, c.content, v.title 
                 FROM commentaires c
                 JOIN videos v ON c.video_id = v.id
                 WHERE c.id = $1",
                [$commentId]
            );

            if (!$comment) {
                return false;
            }

            $preview = mb_strlen($comment['content']) > 50
                ? mb_substr($comment['content'], 0, 50) . '...'
                : $comment['content'];

            return $this->createNotification(
                userId: (int)$comment['user_id'],
                actorId: $actorId,
                type: 'like',
                videoId: (int)$comment['video_id'],
                commentId: $commentId,
                actorName: $actorName,
                videoTitle: $comment['title'],
                commentPreview: $preview
            );

        } catch (\Exception $e) {
            error_log("NotificationCreationService::notifyCommentLike - Error: " . $e->getMessage());
            return false;
        }
    }

    public function notifyReplyLike(int $replyId, int $actorId, string $actorName): bool
    {
        try {
            $reply = $this->db->fetchOne(
                "SELECT r.user_id, r.comment_id, r.content, c.video_id, v.title 
                 FROM comment_replies r
                 JOIN commentaires c ON r.comment_id = c.id
                 JOIN videos v ON c.video_id = v.id
                 WHERE r.id = $1",
                [$replyId]
            );

            if (!$reply) {
                return false;
            }

            $preview = mb_strlen($reply['content']) > 50
                ? mb_substr($reply['content'], 0, 50) . '...'
                : $reply['content'];

            return $this->createNotification(
                userId: (int)$reply['user_id'],
                actorId: $actorId,
                type: 'like',
                videoId: (int)$reply['video_id'],
                commentId: (int)$reply['comment_id'],
                actorName: $actorName,
                videoTitle: $reply['title'],
                commentPreview: $preview
            );

        } catch (\Exception $e) {
            error_log("NotificationCreationService::notifyReplyLike - Error: " . $e->getMessage());
            return false;
        }
    }

    public function notifyVideoUpload(int $creatorId, int $videoId, string $creatorName, string $videoTitle): bool
    {
        try {
            $subscribers = $this->db->fetchAll(
                "SELECT subscriber_id FROM subscriptions WHERE creator_id = $1",
                [$creatorId]
            );

            if (empty($subscribers)) {
                return true;
            }

            $success = true;
            foreach ($subscribers as $subscriber) {
                $result = $this->createNotification(
                    userId: (int)$subscriber['subscriber_id'],
                    actorId: $creatorId,
                    type: 'video_upload',
                    videoId: $videoId,
                    actorName: $creatorName,
                    videoTitle: $videoTitle
                );
                $success = $success && $result;
            }

            return $success;

        } catch (\Exception $e) {
            error_log("NotificationCreationService::notifyVideoUpload - Error: " . $e->getMessage());
            return false;
        }
    }

    public function createSubscriptionNotification(int $targetUserId, int $subscriberId): bool
    {
        try {
            $subscriber = $this->userModel->findById($subscriberId);

            if (!$subscriber) {
                return false;
            }

            $subscriberName = $subscriber['username'] ?? 'Utilisateur';

            return $this->notifySubscribe($targetUserId, $subscriberId, $subscriberName);

        } catch (\Exception $e) {
            error_log("NotificationCreationService::createSubscriptionNotification - Error: " . $e->getMessage());
            return false;
        }
    }

    public function createCommentNotification(
        int $userId,
        ?int $actorId,
        ?int $videoId,
        ?int $commentId,
        string $type
    ): bool {
        if (!$actorId) {
            return false;
        }

        try {
            $actor = $this->userModel->findById($actorId);
            $actorName = $actor['username'] ?? 'Utilisateur';
            $videoTitle = null;
            $commentPreview = null;

            if ($videoId) {
                $video = $this->db->fetchOne(
                    "SELECT title FROM videos WHERE id = $1",
                    [$videoId]
                );
                $videoTitle = $video['title'] ?? null;
            }

            if ($commentId) {
                $comment = $this->db->fetchOne(
                    "SELECT content FROM commentaires WHERE id = $1",
                    [$commentId]
                );

                if ($comment) {
                    $content = $comment['content'];
                    $commentPreview = mb_strlen($content) > 50
                        ? mb_substr($content, 0, 50) . '...'
                        : $content;
                }
            }

            return $this->createNotification(
                userId: $userId,
                actorId: $actorId,
                type: $type,
                videoId: $videoId,
                commentId: $commentId,
                actorName: $actorName,
                videoTitle: $videoTitle,
                commentPreview: $commentPreview
            );

        } catch (\Exception $e) {
            error_log("NotificationCreationService::createCommentNotification - Error: " . $e->getMessage());
            return false;
        }
    }

    public function notifyVideoDislike(int $videoId, int $actorId, string $actorName): bool
    {
        try {
            $video = $this->db->fetchOne(
                "SELECT user_id, title FROM videos WHERE id = $1",
                [$videoId]
            );

            if (!$video) {
                return false;
            }

            return $this->createNotification(
                userId: (int)$video['user_id'],
                actorId: $actorId,
                type: 'dislike',
                videoId: $videoId,
                actorName: $actorName,
                videoTitle: $video['title']
            );

        } catch (\Exception $e) {
            error_log("NotificationCreationService::notifyVideoDislike - Error: " . $e->getMessage());
            return false;
        }
    }

    public function markAllAsReadForUser(int $userId): bool
    {
        try {
            $this->db->execute(
                "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
                [$userId]
            );

            return true;

        } catch (\Exception $e) {
            error_log("NotificationCreationService::markAllAsReadForUser - Error: " . $e->getMessage());
            return false;
        }
    }

    public function cleanupOldNotifications(int $daysToKeep = 90): int
    {
        try {
            $result = $this->db->fetchOne(
                "DELETE FROM notifications 
                 WHERE created_at < NOW() - ($1 || ' days')::interval
                 RETURNING COUNT(*) as deleted",
                [$daysToKeep]
            );

            return (int)($result['deleted'] ?? 0);

        } catch (\Exception $e) {
            error_log("NotificationCreationService::cleanupOldNotifications - Error: " . $e->getMessage());
            return 0;
        }
    }
}