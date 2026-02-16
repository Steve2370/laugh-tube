<?php

namespace App\Services;

use App\Interfaces\DatabaseInterface;
use App\Models\Commentaire;
use App\Models\User;
use App\Models\Video;
use Database;
use PDO;

class CommentaireService
{
    public function __construct(
        private Commentaire $commentaireModel,
        private Video $videoModel,
        private User $userModel,
        private DatabaseInterface $db,
        private ?NotificationCreationService $notificationService = null
    ) {}

    private function createNotification(
        int $userId,
        ?int $actorId,
        string $type,
        ?int $videoId = null,
        ?int $commentId = null,
        ?string $actorName = null,
        ?string $videoTitle = null,
        ?string $commentPreview = null
    ): void {
        if ($actorId && $actorId === $userId) {
            return;
        }

        try {
            if ($this->notificationService) {
                $this->notificationService->createCommentNotification(
                    $userId,
                    $actorId,
                    $videoId,
                    $commentId,
                    $type
                );
                return;
            }

            $sql = "INSERT INTO notifications 
                    (user_id, actor_id, type, video_id, comment_id, actor_name, video_title, comment_preview)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)";

            $this->db->execute($sql, [
                $userId,
                $actorId,
                $type,
                $videoId,
                $commentId,
                $actorName,
                $videoTitle,
                $commentPreview
            ]);

        } catch (\Exception $e) {
            error_log("CommentaireService::createNotification - Error: " . $e->getMessage());
        }
    }

    public function getCommentaires(int $videoId): array
    {
        if (!$this->videoModel->exists($videoId, true)) {
            return [
                'success' => false,
                'message' => 'Vidéo introuvable',
                'code' => 404
            ];
        }

        try {
            $sql = "SELECT 
                        c.id, 
                        c.user_id, 
                        c.content, 
                        c.created_at,
                        u.username, 
                        u.avatar_url,
                        COALESCE((SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id), 0)::int AS like_count
                    FROM commentaires c
                    JOIN users u ON c.user_id = u.id
                    WHERE c.video_id = $1
                    ORDER BY c.created_at ASC";

            $comments = $this->db->fetchAll($sql, [$videoId]);

            if (empty($comments)) {
                return [
                    'success' => true,
                    'commentaires' => [],
                    'comments' => []
                ];
            }

            $commentIds = array_column($comments, 'id');

            $placeholders = implode(',', array_map(fn($i) => '$' . ($i + 1), array_keys($commentIds)));

            $sqlReplies = "SELECT 
                            r.id, 
                            r.comment_id, 
                            r.user_id, 
                            r.content, 
                            r.created_at,
                            u.username, 
                            u.avatar_url,
                            COALESCE((SELECT COUNT(*) FROM reply_likes rl WHERE rl.reply_id = r.id), 0)::int AS like_count
                           FROM comment_replies r
                           JOIN users u ON r.user_id = u.id
                           WHERE r.comment_id IN ($placeholders)
                           ORDER BY r.created_at ASC";

            $allReplies = $this->db->fetchAll($sqlReplies, $commentIds);

            $repliesByComment = [];
            foreach ($allReplies as $reply) {
                $repliesByComment[$reply['comment_id']][] = $reply;
            }

            foreach ($comments as &$comment) {
                $comment['replies'] = $repliesByComment[$comment['id']] ?? [];
            }

            return [
                'success' => true,
                'commentaires' => $comments,
                'comments' => $comments
            ];

        } catch (\Exception $e) {
            error_log("CommentaireService::getCommentaires - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la récupération des commentaires',
                'code' => 500
            ];
        }
    }

    public function ajouterCommentaire(int $videoId, int $userId, string $content): array
    {
        return $this->createCommentaire($videoId, $userId, $content);
    }

    public function createCommentaire(int $videoId, int $userId, string $content): array
    {
        if (!$this->videoModel->exists($videoId, true)) {
            return [
                'success' => false,
                'message' => 'Vidéo introuvable',
                'code' => 404
            ];
        }
        $content = trim($content);

        if (strlen($content) === 0) {
            return [
                'success' => false,
                'message' => 'Le commentaire ne peut pas être vide',
                'code' => 400
            ];
        }

        if (strlen($content) > 2000) {
            return [
                'success' => false,
                'message' => 'Le commentaire est trop long (max 2000 caractères)',
                'code' => 400
            ];
        }

        try {
            $sql = "INSERT INTO commentaires (user_id, video_id, content)
                    VALUES ($1, $2, $3)
                    RETURNING id, created_at";

            $result = $this->db->fetchOne($sql, [$userId, $videoId, $content]);

            if (!$result) {
                return [
                    'success' => false,
                    'message' => 'Erreur lors de la création du commentaire',
                    'code' => 500
                ];
            }

            $user = $this->userModel->findById($userId);
            $video = $this->videoModel->findById($videoId);

            if ($video && isset($video['user_id'])) {
                $preview = mb_strlen($content) > 50
                    ? mb_substr($content, 0, 50) . '...'
                    : $content;

                $this->createNotification(
                    userId: (int)$video['user_id'],
                    actorId: $userId,
                    type: 'comment',
                    videoId: $videoId,
                    actorName: $user['username'] ?? 'Utilisateur',
                    videoTitle: $video['title'] ?? 'Vidéo',
                    commentPreview: $preview
                );
            }

            return [
                'success' => true,
                'message' => 'Commentaire ajouté',
                'comment' => [
                    'id' => $result['id'],
                    'user_id' => $userId,
                    'video_id' => $videoId,
                    'username' => $user['username'] ?? 'Utilisateur',
                    'avatar_url' => $user['avatar_url'] ?? null,
                    'content' => $content,
                    'created_at' => $result['created_at'],
                    'like_count' => 0,
                    'replies' => []
                ]
            ];

        } catch (\Exception $e) {
            error_log("CommentaireService::createCommentaire - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la création du commentaire',
                'code' => 500
            ];
        }
    }

    public function replyToComment(int $commentId, int $userId, string $content): array
    {
        $commentExists = $this->db->fetchOne(
            "SELECT id, video_id, user_id FROM commentaires WHERE id = $1",
            [$commentId]
        );

        if (!$commentExists) {
            return [
                'success' => false,
                'message' => 'Commentaire introuvable',
                'code' => 404
            ];
        }

        $content = trim($content);

        if (strlen($content) === 0) {
            return [
                'success' => false,
                'message' => 'La réponse ne peut pas être vide',
                'code' => 400
            ];
        }

        if (strlen($content) > 1000) {
            return [
                'success' => false,
                'message' => 'La réponse est trop longue (max 1000 caractères)',
                'code' => 400
            ];
        }

        try {
            $sql = "INSERT INTO comment_replies (comment_id, user_id, content)
                    VALUES ($1, $2, $3)
                    RETURNING id, created_at";

            $result = $this->db->fetchOne($sql, [$commentId, $userId, $content]);

            if (!$result) {
                return [
                    'success' => false,
                    'message' => 'Erreur lors de la création de la réponse',
                    'code' => 500
                ];
            }

            $user = $this->userModel->findById($userId);
            $commentInfo = $this->db->fetchOne(
                "SELECT c.user_id, c.video_id, v.title 
                 FROM commentaires c
                 JOIN videos v ON c.video_id = v.id
                 WHERE c.id = $1",
                [$commentId]
            );

            if ($commentInfo) {
                $preview = mb_strlen($content) > 50
                    ? mb_substr($content, 0, 50) . '...'
                    : $content;

                $this->createNotification(
                    userId: (int)$commentInfo['user_id'],
                    actorId: $userId,
                    type: 'reply',
                    videoId: (int)$commentInfo['video_id'],
                    commentId: $commentId,
                    actorName: $user['username'] ?? 'Utilisateur',
                    videoTitle: $commentInfo['title'] ?? 'Vidéo',
                    commentPreview: $preview
                );
            }

            return [
                'success' => true,
                'message' => 'Réponse ajoutée',
                'reply' => [
                    'id' => $result['id'],
                    'comment_id' => $commentId,
                    'user_id' => $userId,
                    'username' => $user['username'] ?? 'Utilisateur',
                    'avatar_url' => $user['avatar_url'] ?? null,
                    'content' => $content,
                    'created_at' => $result['created_at'],
                    'like_count' => 0
                ]
            ];

        } catch (\Exception $e) {
            error_log("CommentaireService::replyToComment - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la création de la réponse',
                'code' => 500
            ];
        }
    }

    public function toggleCommentLike(int $commentId, int $userId): array
    {
        $commentExists = $this->db->fetchOne(
            "SELECT id FROM commentaires WHERE id = $1",
            [$commentId]
        );

        if (!$commentExists) {
            return [
                'success' => false,
                'message' => 'Commentaire introuvable',
                'code' => 404
            ];
        }

        try {
            $alreadyLiked = $this->db->fetchOne(
                "SELECT 1 FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
                [$commentId, $userId]
            );

            if ($alreadyLiked) {
                $this->db->execute(
                    "DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
                    [$commentId, $userId]
                );
                $liked = false;
            } else {
                $this->db->execute(
                    "INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)",
                    [$commentId, $userId]
                );
                $liked = true;
                $user = $this->userModel->findById($userId);

                $commentInfo = $this->db->fetchOne(
                    "SELECT c.user_id, c.content, c.video_id, v.title 
                     FROM commentaires c
                     JOIN videos v ON c.video_id = v.id
                     WHERE c.id = $1",
                    [$commentId]
                );

                if ($commentInfo) {
                    $preview = mb_strlen($commentInfo['content']) > 50
                        ? mb_substr($commentInfo['content'], 0, 50) . '...'
                        : $commentInfo['content'];

                    $this->createNotification(
                        userId: (int)$commentInfo['user_id'],
                        actorId: $userId,
                        type: 'like',
                        videoId: (int)$commentInfo['video_id'],
                        commentId: $commentId,
                        actorName: $user['username'] ?? 'Utilisateur',
                        videoTitle: $commentInfo['title'] ?? 'Vidéo',
                        commentPreview: $preview
                    );
                }
            }

            $likeCountResult = $this->db->fetchOne(
                "SELECT COUNT(*)::int AS cnt FROM comment_likes WHERE comment_id = $1",
                [$commentId]
            );

            $likeCount = (int)($likeCountResult['cnt'] ?? 0);

            return [
                'success' => true,
                'liked' => $liked,
                'like_count' => $likeCount
            ];

        } catch (\Exception $e) {
            error_log("CommentaireService::toggleCommentLike - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors du like',
                'code' => 500
            ];
        }
    }

    public function getCommentLikeStatus(int $commentId, ?int $userId): array
    {
        if (!$userId) {
            return [
                'success' => true,
                'liked' => false,
                'like_count' => 0
            ];
        }

        try {
            $likeCountResult = $this->db->fetchOne(
                "SELECT COUNT(*)::int AS cnt FROM comment_likes WHERE comment_id = $1",
                [$commentId]
            );

            $userLiked = $this->db->fetchOne(
                "SELECT 1 FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
                [$commentId, $userId]
            );

            return [
                'success' => true,
                'liked' => (bool)$userLiked,
                'like_count' => (int)($likeCountResult['cnt'] ?? 0)
            ];

        } catch (\Exception $e) {
            error_log("CommentaireService::getCommentLikeStatus - Error: " . $e->getMessage());

            return [
                'success' => true,
                'liked' => false,
                'like_count' => 0
            ];
        }
    }

    public function toggleReplyLike(int $replyId, int $userId): array
    {
        $replyExists = $this->db->fetchOne(
            "SELECT id FROM comment_replies WHERE id = $1",
            [$replyId]
        );

        if (!$replyExists) {
            return [
                'success' => false,
                'message' => 'Réponse introuvable',
                'code' => 404
            ];
        }

        try {
            $alreadyLiked = $this->db->fetchOne(
                "SELECT 1 FROM reply_likes WHERE reply_id = $1 AND user_id = $2",
                [$replyId, $userId]
            );

            if ($alreadyLiked) {
                $this->db->execute(
                    "DELETE FROM reply_likes WHERE reply_id = $1 AND user_id = $2",
                    [$replyId, $userId]
                );
                $liked = false;
            } else {
                $this->db->execute(
                    "INSERT INTO reply_likes (reply_id, user_id) VALUES ($1, $2)",
                    [$replyId, $userId]
                );
                $liked = true;
                $user = $this->userModel->findById($userId);

                $replyInfo = $this->db->fetchOne(
                    "SELECT r.user_id, r.content, r.comment_id, c.video_id, v.title 
                     FROM comment_replies r
                     JOIN commentaires c ON r.comment_id = c.id
                     JOIN videos v ON c.video_id = v.id
                     WHERE r.id = $1",
                    [$replyId]
                );

                if ($replyInfo) {
                    $preview = mb_strlen($replyInfo['content']) > 50
                        ? mb_substr($replyInfo['content'], 0, 50) . '...'
                        : $replyInfo['content'];

                    $this->createNotification(
                        userId: (int)$replyInfo['user_id'],
                        actorId: $userId,
                        type: 'like',
                        videoId: (int)$replyInfo['video_id'],
                        commentId: (int)$replyInfo['comment_id'],
                        actorName: $user['username'] ?? 'Utilisateur',
                        videoTitle: $replyInfo['title'] ?? 'Vidéo',
                        commentPreview: $preview
                    );
                }
            }

            $likeCountResult = $this->db->fetchOne(
                "SELECT COUNT(*)::int AS cnt FROM reply_likes WHERE reply_id = $1",
                [$replyId]
            );

            return [
                'success' => true,
                'liked' => $liked,
                'like_count' => (int)($likeCountResult['cnt'] ?? 0)
            ];

        } catch (\Exception $e) {
            error_log("CommentaireService::toggleReplyLike - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors du like',
                'code' => 500
            ];
        }
    }

    public function getReplyLikeStatus(int $replyId, ?int $userId): array
    {
        if (!$userId) {
            return [
                'success' => true,
                'liked' => false,
                'like_count' => 0
            ];
        }

        try {
            $likeCountResult = $this->db->fetchOne(
                "SELECT COUNT(*)::int AS cnt FROM reply_likes WHERE reply_id = $1",
                [$replyId]
            );

            $userLiked = $this->db->fetchOne(
                "SELECT 1 FROM reply_likes WHERE reply_id = $1 AND user_id = $2",
                [$replyId, $userId]
            );

            return [
                'success' => true,
                'liked' => (bool)$userLiked,
                'like_count' => (int)($likeCountResult['cnt'] ?? 0)
            ];

        } catch (\Exception $e) {
            error_log("CommentaireService::getReplyLikeStatus - Error: " . $e->getMessage());

            return [
                'success' => true,
                'liked' => false,
                'like_count' => 0
            ];
        }
    }

    public function deleteCommentaire(int $commentId, int $userId): array
    {
        try {
            $comment = $this->db->fetchOne(
                "SELECT id, user_id FROM commentaires WHERE id = $1",
                [$commentId]
            );

            if (!$comment) {
                return [
                    'success' => false,
                    'message' => 'Commentaire introuvable',
                    'code' => 404
                ];
            }

            if ((int)$comment['user_id'] !== $userId) {
                return [
                    'success' => false,
                    'message' => 'Vous n\'êtes pas autorisé à supprimer ce commentaire',
                    'code' => 403
                ];
            }

            $this->db->execute(
                "DELETE FROM commentaires WHERE id = $1",
                [$commentId]
            );

            return [
                'success' => true,
                'message' => 'Commentaire supprimé'
            ];

        } catch (\Exception $e) {
            error_log("CommentaireService::deleteCommentaire - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la suppression',
                'code' => 500
            ];
        }
    }
}