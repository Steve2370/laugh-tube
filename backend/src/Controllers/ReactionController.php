<?php

namespace App\Controllers;

use App\Middleware\AuthMiddleware;
use App\Services\AuditService;
use App\Services\ReactionService;

class ReactionController
{
    public function __construct(
        private ReactionService $reactionService,
        private AuthMiddleware $authMiddleware,
        private AuditService $auditService
    ) {}

    public function like(int $videoId): void
    {
        try {
            $currentUser = $this->authMiddleware->handleRequired();
            if (!$currentUser) {
                http_response_code(401);
                return;
            }

            $result = $this->reactionService->toggleLike($currentUser['user_id'], $videoId);

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
                'action' => $result['action'],
                'liked' => $result['liked'],
                'disliked' => $result['disliked']
            ]);

        } catch (\Exception $e) {
            error_log("ReactionController::like - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur serveur'
            ]);
        }
    }

    public function dislike(int $videoId): void
    {
        try {
            $currentUser = $this->authMiddleware->handleRequired();
            if (!$currentUser) {
                http_response_code(401);
                return;
            }

            $result = $this->reactionService->toggleDislike($currentUser['user_id'], $videoId);

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
                'action' => $result['action'],
                'liked' => $result['liked'],
                'disliked' => $result['disliked']
            ]);

        } catch (\Exception $e) {
            error_log("ReactionController::dislike - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur serveur'
            ]);
        }
    }

    public function getStatus(int $videoId): void
    {
        try {
            $currentUser = $this->authMiddleware->handleOptional();

            if (!$currentUser) {
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'liked' => false,
                    'disliked' => false
                ]);
                return;
            }

            $result = $this->reactionService->getUserReactionStatus($currentUser['user_id'], $videoId);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'liked' => $result['liked'],
                'disliked' => $result['disliked']
            ]);

        } catch (\Exception $e) {
            error_log("ReactionController::getStatus - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur serveur'
            ]);
        }
    }

    public function getCounts(int $videoId): void
    {
        try {
            $result = $this->reactionService->getReactionCounts($videoId);

            header('Content-Type: application/json');
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'likes_count' => $result['likes_count'] ?? 0,
                'dislikes_count' => $result['dislikes_count'] ?? 0
            ]);

        } catch (\Exception $e) {
            error_log("ReactionController::getCounts - Error: " . $e->getMessage());
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur serveur'
            ]);
        }
    }

    public function status(int $videoId): void
    {
        $this->getStatus($videoId);
    }

    public function counts(int $videoId): void
    {
        $this->getCounts($videoId);
    }
}