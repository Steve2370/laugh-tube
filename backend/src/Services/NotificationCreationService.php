<?php

namespace App\Services;

use App\Interfaces\DatabaseInterface;
use App\Models\User;

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
                    $commentPreview = mb_strlen($content) > 50 ? mb_substr($content, 0, 50) . '...' : $content;
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
}