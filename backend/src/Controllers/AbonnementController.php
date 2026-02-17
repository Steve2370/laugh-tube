<?php

namespace App\Controllers;

use App\Middleware\AuthMiddleware;
use App\Services\AbonnementService;
use App\Services\AuditService;
use App\Utils\JsonResponse;

class AbonnementController
{
    public function __construct(
        private AbonnementService $abonnementService,
        private AuthMiddleware $authMiddleware,
    ) {}

    public function subscribe(int $targetUserId): void
    {
        try {
            $currentUser = $this->authMiddleware->handleRequired();
            if (!$currentUser) {
                http_response_code(401);
                return;
            }

            if ($currentUser['user_id'] === $targetUserId) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Vous ne pouvez pas vous abonner à vous-même'
                ]);
                return;
            }

            $result = $this->abonnementService->subscribe($currentUser['user_id'], $targetUserId);

            if (!$result['success']) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => $result['message']
                ]);
                return;
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'subscribed' => true,
                'subscribers_count' => $result['subscribers_count']
            ]);

        } catch (\Exception $e) {
            error_log("AbonnementController::subscribe - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur serveur'
            ]);
        }
    }

    public function unsubscribe(int $targetUserId): void
    {
        try {
            $currentUser = $this->authMiddleware->handleRequired();
            if (!$currentUser) {
                http_response_code(401);
                return;
            }

            $result = $this->abonnementService->unsubscribe($currentUser['user_id'], $targetUserId);

            if (!$result['success']) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => $result['message']
                ]);
                return;
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'subscribed' => false,
                'subscribers_count' => $result['subscribers_count']
            ]);

        } catch (\Exception $e) {
            error_log("AbonnementController::unsubscribe - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur serveur'
            ]);
        }
    }

    public function getStatus(int $targetUserId): void
    {
        try {
            $currentUser = $this->authMiddleware->handleOptional();

            if (!$currentUser) {
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'is_subscribed' => false,
                    'subscribers_count' => $this->abonnementService->getSubscribersCount($targetUserId)
                ]);
                return;
            }

            $result = $this->abonnementService->getStatus($currentUser['user_id'], $targetUserId);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'is_subscribed' => $result['is_subscribed'],
                'subscribers_count' => $result['subscribers_count']
            ]);

        } catch (\Exception $e) {
            error_log("AbonnementController::getStatus - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur serveur'
            ]);
        }
    }

    public function getSubscribers(int $userId): void
    {
        try {
            $result = $this->abonnementService->getSubscribers($userId);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'subscribers' => $result['subscribers']
            ]);

        } catch (\Exception $e) {
            error_log("AbonnementController::getSubscribers - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur serveur'
            ]);
        }
    }

    public function getSubscriptions(int $userId): void
    {
        try {
            $result = $this->abonnementService->getSubscriptions($userId);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'subscriptions' => $result['subscriptions']
            ]);

        } catch (\Exception $e) {
            error_log("AbonnementController::getSubscriptions - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur serveur'
            ]);
        }
    }
}