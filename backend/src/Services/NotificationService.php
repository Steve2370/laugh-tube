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

    public function getUserNotifications(int $userId, int $limit = 20, int $offset = 0): array
    {
        $limit = min(max(1, $limit), 100);
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
}