<?php

namespace App\Services;

use App\Models\Reaction;
use App\Models\Video;

class ReactionService
{
    public function __construct(
        private Reaction $reactionModel,
        private Video $videoModel,
        private ?NotificationService $notificationService = null
    ) {}

    public function toggleLike(int $userId, int $videoId): array
    {
        if (!$this->videoModel->exists($videoId, true)) {
            return [
                'success' => false,
                'message' => 'Vidéo introuvable',
                'code' => 404
            ];
        }

        try {
            $hasLiked = $this->reactionModel->hasLiked($userId, $videoId);

            if ($hasLiked) {
                $this->reactionModel->unlike($userId, $videoId);

                return [
                    'success' => true,
                    'action' => 'unliked',
                    'message' => 'Like retiré',
                    'liked' => false,
                    'disliked' => false
                ];
            } else {
                if ($this->reactionModel->hasDisliked($userId, $videoId)) {
                    $this->reactionModel->undislike($userId, $videoId);
                }

                $this->reactionModel->like($userId, $videoId);
                if ($this->notificationService) {
                    try {
                        $video = $this->videoModel->findById($videoId);
                        if ($video && isset($video['user_id'])) {
                            $this->notificationService->notifyLike(
                                (int)$video['user_id'],
                                $userId,
                                $videoId
                            );
                        }
                    } catch (\Exception $e) {
                        error_log("ReactionService::toggleLike - Notification error: " . $e->getMessage());
                    }
                }

                return [
                    'success' => true,
                    'action' => 'liked',
                    'message' => 'Vidéo likée',
                    'liked' => true,
                    'disliked' => false
                ];
            }

        } catch (\Exception $e) {
            error_log("ReactionService::toggleLike - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors du like',
                'code' => 500
            ];
        }
    }

    public function toggleDislike(int $userId, int $videoId): array
    {
        if (!$this->videoModel->exists($videoId, true)) {
            return [
                'success' => false,
                'message' => 'Vidéo introuvable',
                'code' => 404
            ];
        }

        try {
            $hasDisliked = $this->reactionModel->hasDisliked($userId, $videoId);

            if ($hasDisliked) {
                $this->reactionModel->undislike($userId, $videoId);

                return [
                    'success' => true,
                    'action' => 'undisliked',
                    'message' => 'Dislike retiré',
                    'liked' => false,
                    'disliked' => false
                ];
            } else {
                if ($this->reactionModel->hasLiked($userId, $videoId)) {
                    $this->reactionModel->unlike($userId, $videoId);
                }

                $this->reactionModel->dislike($userId, $videoId);

                if ($this->notificationService) {
                    try {
                        $video = $this->videoModel->findById($videoId);
                        if ($video && isset($video['user_id'])) {
                            $this->notificationService->notifyDislike(
                                (int)$video['user_id'],
                                $userId,
                                $videoId
                            );
                        }
                    } catch (\Exception $e) {
                        error_log("ReactionService::toggleDislike - Notification error: " . $e->getMessage());
                    }
                }

                return [
                    'success' => true,
                    'action' => 'disliked',
                    'message' => 'Vidéo dislikée',
                    'liked' => false,
                    'disliked' => true
                ];
            }

        } catch (\Exception $e) {
            error_log("ReactionService::toggleDislike - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors du dislike',
                'code' => 500
            ];
        }
    }

    public function getUserReactionStatus(int $userId, int $videoId): array
    {
        try {
            $hasLiked = $this->reactionModel->hasLiked($userId, $videoId);
            $hasDisliked = $this->reactionModel->hasDisliked($userId, $videoId);

            return [
                'success' => true,
                'like_by_me' => $hasLiked,
                'dislike_by_me' => $hasDisliked,
                'liked' => $hasLiked,
                'disliked' => $hasDisliked
            ];

        } catch (\Exception $e) {
            error_log("ReactionService::getUserReactionStatus - Error: " . $e->getMessage());

            return [
                'success' => false,
                'like_by_me' => false,
                'dislike_by_me' => false,
                'liked' => false,
                'disliked' => false
            ];
        }
    }

    public function getReactionCounts(int $videoId): array
    {
        try {
            $likes = $this->reactionModel->countLikes($videoId);
            $dislikes = $this->reactionModel->countDislikes($videoId);

            return [
                'success' => true,
                'likes' => $likes,
                'dislikes' => $dislikes,
                'like_count' => $likes,
                'dislike_count' => $dislikes,
                'total' => $likes + $dislikes
            ];

        } catch (\Exception $e) {
            error_log("ReactionService::getReactionCounts - Error: " . $e->getMessage());

            return [
                'success' => false,
                'likes' => 0,
                'dislikes' => 0,
                'like_count' => 0,
                'dislike_count' => 0,
                'total' => 0
            ];
        }
    }
}