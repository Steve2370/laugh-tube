<?php

namespace App\Services;

use App\Models\Notification;
use App\Models\User;

class NotificationService
{
    public function __construct(
        private Notification $notificationModel,
        private User $userModel
    ) {}

    public function notifyLike(int $videoOwnerId, int $actorId, int $videoId): bool
    {
        if ($videoOwnerId === $actorId) {
            return false;
        }

        try {
            if ($this->notificationModel->notificationExists($videoOwnerId, 'like', $videoId, $actorId)) {
                return false;
            }

            $this->notificationModel->create([
                'user_id' => $videoOwnerId,
                'actor_id' => $actorId,
                'type' => 'like',
                'video_id' => $videoId
            ]);

            return true;

        } catch (\Exception $e) {
            error_log("NotificationService::notifyLike - Error: " . $e->getMessage());
            return false;
        }
    }

    public function notifyComment(int $videoOwnerId, int $actorId, int $videoId, int $commentId): bool
    {
        if ($videoOwnerId === $actorId) {
            return false;
        }

        try {
            $this->notificationModel->create([
                'user_id' => $videoOwnerId,
                'actor_id' => $actorId,
                'type' => 'comment',
                'video_id' => $videoId,
                'comment_id' => $commentId
            ]);

            return true;

        } catch (\Exception $e) {
            error_log("NotificationService::notifyComment - Error: " . $e->getMessage());
            return false;
        }
    }

    public function notifySubscribe(int $subscribedToId, int $subscriberId): bool
    {
        if ($subscribedToId === $subscriberId) {
            return false;
        }

        try {
            if ($this->notificationModel->notificationExists($subscribedToId, 'subscribe', null, $subscriberId)) {
                return false;
            }

            $this->notificationModel->create([
                'user_id' => $subscribedToId,
                'actor_id' => $subscriberId,
                'type' => 'subscribe'
            ]);

            return true;

        } catch (\Exception $e) {
            error_log("NotificationService::notifySubscribe - Error: " . $e->getMessage());
            return false;
        }
    }

    public function notifyMention(int $mentionedUserId, int $actorId, int $videoId, int $commentId): bool
    {
        if ($mentionedUserId === $actorId) {
            return false;
        }

        try {
            $this->notificationModel->create([
                'user_id' => $mentionedUserId,
                'actor_id' => $actorId,
                'type' => 'mention',
                'video_id' => $videoId,
                'comment_id' => $commentId
            ]);

            return true;

        } catch (\Exception $e) {
            error_log("NotificationService::notifyMention - Error: " . $e->getMessage());
            return false;
        }
    }

    public function notifyReply(int $originalCommentAuthorId, int $actorId, int $videoId, int $commentId): bool
    {
        if ($originalCommentAuthorId === $actorId) {
            return false;
        }

        try {
            $this->notificationModel->create([
                'user_id' => $originalCommentAuthorId,
                'actor_id' => $actorId,
                'type' => 'reply',
                'video_id' => $videoId,
                'comment_id' => $commentId
            ]);

            return true;

        } catch (\Exception $e) {
            error_log("NotificationService::notifyReply - Error: " . $e->getMessage());
            return false;
        }
    }

    public function notifyNewVideo(int $creatorId, int $videoId, array $subscriberIds): int
    {
        if (empty($subscriberIds)) {
            return 0;
        }

        $successCount = 0;

        try {
            foreach ($subscriberIds as $subscriberId) {
                if ($subscriberId === $creatorId) {
                    continue;
                }

                try {
                    $this->notificationModel->create([
                        'user_id' => $subscriberId,
                        'actor_id' => $creatorId,
                        'type' => 'video_upload',
                        'video_id' => $videoId
                    ]);

                    $successCount++;

                } catch (\Exception $e) {
                    error_log("NotificationService::notifyNewVideo - Error for subscriber {$subscriberId}: " . $e->getMessage());
                    continue;
                }
            }

            return $successCount;

        } catch (\Exception $e) {
            error_log("NotificationService::notifyNewVideo - Error: " . $e->getMessage());
            return $successCount;
        }
    }

    public function getUserNotifications(int $userId, int $limit = 20, int $offset = 0): array
    {
        $limit = min(max(1, $limit), 100); // Entre 1 et 100
        $offset = max(0, $offset);

        try {
            $notifications = $this->notificationModel->getUserNotifications($userId, $limit, $offset);

            return [
                'success' => true,
                'notifications' => $notifications,
                'count' => count($notifications),
                'limit' => $limit,
                'offset' => $offset
            ];

        } catch (\Exception $e) {
            error_log("NotificationService::getUserNotifications - Error: " . $e->getMessage());

            return [
                'success' => false,
                'notifications' => [],
                'count' => 0,
                'error' => 'Erreur lors de la récupération des notifications'
            ];
        }
    }

    public function getUnreadCount(int $userId): int
    {
        try {
            return $this->notificationModel->getUnreadCount($userId);

        } catch (\Exception $e) {
            error_log("NotificationService::getUnreadCount - Error: " . $e->getMessage());
            return 0;
        }
    }

    public function markAsRead(int $notificationId, int $userId): array
    {
        try {
            $result = $this->notificationModel->markAsRead($notificationId, $userId);

            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Notification marquée comme lue'
                ];
            }

            return [
                'success' => false,
                'message' => 'Notification introuvable ou déjà lue',
                'code' => 404
            ];

        } catch (\Exception $e) {
            error_log("NotificationService::markAsRead - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la mise à jour',
                'code' => 500
            ];
        }
    }

    public function markAllAsRead(int $userId): array
    {
        try {
            $count = $this->notificationModel->markAllAsRead($userId);

            return [
                'success' => true,
                'message' => "$count notification(s) marquée(s) comme lue(s)",
                'count' => $count
            ];

        } catch (\Exception $e) {
            error_log("NotificationService::markAllAsRead - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la mise à jour',
                'code' => 500
            ];
        }
    }

    public function deleteNotification(int $notificationId, int $userId): array
    {
        try {
            $result = $this->notificationModel->delete($notificationId, $userId);

            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Notification supprimée'
                ];
            }

            return [
                'success' => false,
                'message' => 'Notification introuvable',
                'code' => 404
            ];

        } catch (\Exception $e) {
            error_log("NotificationService::deleteNotification - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la suppression',
                'code' => 500
            ];
        }
    }

    public function deleteAllNotifications(int $userId): array
    {
        try {
            $count = $this->notificationModel->deleteAllForUser($userId);

            return [
                'success' => true,
                'message' => "$count notification(s) supprimée(s)",
                'count' => $count
            ];

        } catch (\Exception $e) {
            error_log("NotificationService::deleteAllNotifications - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la suppression',
                'code' => 500
            ];
        }
    }

    public function cleanupOldNotifications(int $daysToKeep = 90): array
    {
        try {
            $count = $this->notificationModel->deleteOldNotifications($daysToKeep);

            return [
                'success' => true,
                'message' => "$count notification(s) supprimée(s)",
                'count' => $count,
                'days_kept' => $daysToKeep
            ];

        } catch (\Exception $e) {
            error_log("NotificationService::cleanupOldNotifications - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors du nettoyage',
                'code' => 500,
                'count' => 0
            ];
        }
    }

    public function notifyDislike(int $videoOwnerId, int $actorId, int $videoId): bool
    {
        if ($videoOwnerId === $actorId) {
            return false;
        }

        try {
            if ($this->notificationModel->notificationExists($videoOwnerId, 'dislike', $videoId, $actorId)) {
                return false;
            }

            $this->notificationModel->create([
                'user_id' => $videoOwnerId,
                'actor_id' => $actorId,
                'type' => 'dislike',
                'video_id' => $videoId
            ]);

            return true;

        } catch (\Exception $e) {
            error_log("NotificationService::notifyDislike - Error: " . $e->getMessage());
            return false;
        }
    }

    public function getNotificationStats(int $userId): array
    {
        try {
            $unreadCount = $this->notificationModel->getUnreadCount($userId);

            $typeStats = $this->notificationModel->getTypeStats($userId);

            return [
                'success' => true,
                'stats' => [
                    'unread_count' => $unreadCount,
                    'by_type' => $typeStats,
                    'total' => array_sum(array_column($typeStats, 'count'))
                ]
            ];

        } catch (\Exception $e) {
            error_log("NotificationService::getNotificationStats - Error: " . $e->getMessage());

            return [
                'success' => false,
                'stats' => [
                    'unread_count' => 0,
                    'by_type' => [],
                    'total' => 0
                ]
            ];
        }
    }

    public function hasUnreadNotifications(int $userId): bool
    {
        try {
            return $this->getUnreadCount($userId) > 0;

        } catch (\Exception $e) {
            error_log("NotificationService::hasUnreadNotifications - Error: " . $e->getMessage());
            return false;
        }
    }

    public function getRecentNotifications(int $userId, int $limit = 5): array
    {
        return $this->getUserNotifications($userId, $limit, 0);
    }

    public function markMultipleAsRead(array $notificationIds, int $userId): array
    {
        if (empty($notificationIds)) {
            return [
                'success' => false,
                'message' => 'Aucune notification spécifiée',
                'count' => 0
            ];
        }

        try {
            $successCount = 0;

            foreach ($notificationIds as $notificationId) {
                $result = $this->notificationModel->markAsRead($notificationId, $userId);
                if ($result) {
                    $successCount++;
                }
            }

            return [
                'success' => true,
                'message' => "$successCount notification(s) marquée(s) comme lue(s)",
                'count' => $successCount,
                'total' => count($notificationIds)
            ];

        } catch (\Exception $e) {
            error_log("NotificationService::markMultipleAsRead - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la mise à jour',
                'code' => 500,
                'count' => 0
            ];
        }
    }
}