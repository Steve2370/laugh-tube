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
            $currentUserId = $currentUser['sub'] ?? null;

            if (!$currentUserId) {
                JsonResponse::unauthorized(['success' => false, 'error' => 'Non authentifié']);
                return;
            }

            if ($currentUserId === $targetUserId) {
                JsonResponse::badRequest(['success' => false, 'error' => 'Vous ne pouvez pas vous abonner à vous-même']);
                return;
            }

            $result = $this->abonnementService->subscribe($currentUserId, $targetUserId);

            if (!($result['success'] ?? false)) {
                JsonResponse::badRequest(['success' => false, 'error' => $result['message'] ?? 'Erreur abonnement']);
                return;
            }

            JsonResponse::success([
                'success' => true,
                'is_subscribed' => true,
                'subscribers_count' => $result['subscribers_count'] ?? 0
            ]);

        } catch (\Throwable $e) {
            error_log("AbonnementController::subscribe - " . $e->getMessage());
            JsonResponse::serverError(['success' => false, 'error' => 'Erreur serveur']);
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

    public function getStatus(int $targetUserId, ?int $currentUserId): void
    {
        try {
            if (!$currentUserId) {
                JsonResponse::success([
                    'success' => true,
                    'is_subscribed' => false,
                    'subscribers_count' => $this->abonnementService->getSubscribersCount($targetUserId)
                ]);
                return;
            }

            $result = $this->abonnementService->getStatus($currentUserId, $targetUserId);

            JsonResponse::success([
                'success' => true,
                'is_subscribed' => (bool)($result['is_subscribed'] ?? false),
                'subscribers_count' => (int)($result['subscribers_count'] ?? 0),
            ]);
        } catch (\Throwable $e) {
            error_log("AbonnementController::getStatus - " . $e->getMessage());
            JsonResponse::serverError(['success' => false, 'error' => 'Erreur serveur']);
        }
    }
}