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

    public function afficheLike(int $userId, int $videoId): array
    {
        return $this->toggleLike($userId, $videoId);
    }

    public function afficheDislike(int $userId, int $videoId): array
    {
        return $this->toggleDislike($userId, $videoId);
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

    public function getVideoReactions(int $videoId, ?int $userId = null): array
    {
        try {
            $counts = $this->getReactionCounts($videoId);
            $userStatus = ['liked' => false, 'disliked' => false];

            if ($userId) {
                $status = $this->getUserReactionStatus($userId, $videoId);
                $userStatus = [
                    'liked' => $status['liked'],
                    'disliked' => $status['disliked']
                ];
            }

            return [
                'success' => true,
                'video_id' => $videoId,
                'counts' => [
                    'likes' => $counts['likes'],
                    'dislikes' => $counts['dislikes'],
                    'total' => $counts['total']
                ],
                'user_reaction' => $userStatus
            ];

        } catch (\Exception $e) {
            error_log("ReactionService::getVideoReactions - Error: " . $e->getMessage());

            return [
                'success' => false,
                'video_id' => $videoId,
                'counts' => ['likes' => 0, 'dislikes' => 0, 'total' => 0],
                'user_reaction' => ['liked' => false, 'disliked' => false]
            ];
        }
    }

    public function removeAllReactions(int $userId, int $videoId): array
    {
        try {
            $hasLiked = $this->reactionModel->hasLiked($userId, $videoId);
            $hasDisliked = $this->reactionModel->hasDisliked($userId, $videoId);

            if ($hasLiked) {
                $this->reactionModel->unlike($userId, $videoId);
            }

            if ($hasDisliked) {
                $this->reactionModel->undislike($userId, $videoId);
            }

            return [
                'success' => true,
                'message' => 'Réactions retirées',
                'removed_like' => $hasLiked,
                'removed_dislike' => $hasDisliked
            ];

        } catch (\Exception $e) {
            error_log("ReactionService::removeAllReactions - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la suppression',
                'code' => 500
            ];
        }
    }

    public function getUserLikedVideos(int $userId, int $limit = 20, int $offset = 0): array
    {
        try {
            $videos = $this->reactionModel->getUserLikedVideos($userId, $limit, $offset);

            return [
                'success' => true,
                'videos' => $videos,
                'count' => count($videos),
                'limit' => $limit,
                'offset' => $offset
            ];

        } catch (\Exception $e) {
            error_log("ReactionService::getUserLikedVideos - Error: " . $e->getMessage());

            return [
                'success' => false,
                'videos' => [],
                'count' => 0
            ];
        }
    }

    public function getUserReactionStats(int $userId): array
    {
        try {
            $totalLikes = $this->reactionModel->countUserLikes($userId);
            $totalDislikes = $this->reactionModel->countUserDislikes($userId);

            return [
                'success' => true,
                'stats' => [
                    'total_likes' => $totalLikes,
                    'total_dislikes' => $totalDislikes,
                    'total_reactions' => $totalLikes + $totalDislikes
                ]
            ];

        } catch (\Exception $e) {
            error_log("ReactionService::getUserReactionStats - Error: " . $e->getMessage());

            return [
                'success' => false,
                'stats' => [
                    'total_likes' => 0,
                    'total_dislikes' => 0,
                    'total_reactions' => 0
                ]
            ];
        }
    }

    public function canUserReact(int $userId, int $videoId): array
    {
        try {
            if (!$this->videoModel->exists($videoId, true)) {
                return [
                    'can_react' => false,
                    'reason' => 'video_not_found'
                ];
            }

            $video = $this->videoModel->findById($videoId);

            if ($video && isset($video['user_id']) && (int)$video['user_id'] === $userId) {
                return [
                    'can_react' => false,
                    'reason' => 'own_video'
                ];
            }

            return [
                'can_react' => true
            ];

        } catch (\Exception $e) {
            error_log("ReactionService::canUserReact - Error: " . $e->getMessage());

            return [
                'can_react' => false,
                'reason' => 'error'
            ];
        }
    }

    public function getLikeRatio(int $videoId): array
    {
        try {
            $counts = $this->getReactionCounts($videoId);

            $total = $counts['total'];
            $likes = $counts['likes'];

            if ($total === 0) {
                return [
                    'success' => true,
                    'ratio' => 0.0,
                    'percentage' => 0.0,
                    'likes' => 0,
                    'total' => 0
                ];
            }

            $ratio = $likes / $total;
            $percentage = round($ratio * 100, 2);

            return [
                'success' => true,
                'ratio' => round($ratio, 3),
                'percentage' => $percentage,
                'likes' => $likes,
                'total' => $total
            ];

        } catch (\Exception $e) {
            error_log("ReactionService::getLikeRatio - Error: " . $e->getMessage());

            return [
                'success' => false,
                'ratio' => 0.0,
                'percentage' => 0.0
            ];
        }
    }
}