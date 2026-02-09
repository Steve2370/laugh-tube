<?php

namespace App\Controllers;

use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthMiddleware;
use App\Services\NotificationService;
use App\Utils\JsonResponse;

class NotificationController
{
    public function __construct(
        private readonly NotificationService $notificationService,
        private readonly AuthMiddleware $authMiddleware
    ) {}

    public function list(): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
            }

            $userId = $this->authMiddleware->getUserId();

            $limit = max(1, min(100, (int)($_GET['limit'] ?? 20)));
            $offset = max(0, (int)($_GET['offset'] ?? 0));

            $result = $this->notificationService->getUserNotifications($userId, $limit, $offset);

            JsonResponse::success([
                'notifications' => $result['notifications'],
                'unread_count' => $result['unread_count']
            ]);

        } catch (\Exception $e) {
            error_log("NotificationController::list - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function getNotifications(int $userId): void
    {
        $this->list();
    }

    public function getUnreadCount(): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
            }

            $userId = $this->authMiddleware->getUserId();

            $count = $this->notificationService->getUnreadCount($userId);

            JsonResponse::success(['unread_count' => $count]);

        } catch (\Exception $e) {
            error_log("NotificationController::getUnreadCount - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function markAsRead(int $notificationId): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
            }

            $userId = $this->authMiddleware->getUserId();

            $result = $this->notificationService->markAsRead($notificationId, $userId);

            if (!$result) {
                JsonResponse::notFound(['error' => 'Notification non trouvée']);
            }

            JsonResponse::success(['message' => 'Notification marquée comme lue']);

        } catch (\Exception $e) {
            error_log("NotificationController::markAsRead - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function markAllAsRead(): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
            }

            $userId = $this->authMiddleware->getUserId();

            $count = $this->notificationService->markAllAsRead($userId);

            JsonResponse::success([
                'message' => 'Toutes les notifications marquées comme lues',
                'count' => $count
            ]);

        } catch (\Exception $e) {
            error_log("NotificationController::markAllAsRead - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function delete(int $notificationId): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
            }

            $userId = $this->authMiddleware->getUserId();

            $result = $this->notificationService->deleteNotification($notificationId, $userId);

            if (!$result) {
                JsonResponse::notFound(['error' => 'Notification non trouvée']);
            }

            JsonResponse::success(['message' => 'Notification supprimée']);

        } catch (\Exception $e) {
            error_log("NotificationController::delete - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function deleteNotification(int $notificationId, int $userId): void
    {
        $this->delete($notificationId);
    }
}