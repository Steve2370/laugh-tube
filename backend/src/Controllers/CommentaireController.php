<?php

namespace App\Controllers;

use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthMiddleware;
use App\Services\AuditService;
use App\Services\CommentaireService;
use App\Utils\JsonResponse;
use App\Utils\SecurityHelper;

class CommentaireController
{
    public function __construct(
        private CommentaireService $commentaireService,
        private AuthMiddleware $authMiddleware,
        private AuditService $auditService,
        private DatabaseInterface $db
    ) {}

    public function list(int $videoId): void
    {
        try {
            $result = $this->commentaireService->getCommentaires($videoId);

            if (!$result['success']) {
                JsonResponse::notFound(['error' => $result['message']]);
            }

            JsonResponse::success(['comments' => $result['comments']]);

        } catch (\Exception $e) {
            error_log("CommentaireController::list - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function create(int $videoId): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
            }

            $userId = $this->authMiddleware->getUserId();

            $rawInput = file_get_contents('php://input');
            $data = json_decode($rawInput, true) ?? [];

            $content = SecurityHelper::sanitizeInput($data['content'] ?? '');

            if (empty($content)) {
                JsonResponse::badRequest(['error' => 'Contenu du commentaire requis']);
            }

            if (strlen($content) > 2000) {
                JsonResponse::badRequest(['error' => 'Commentaire trop long (max 2000 caractères)']);
            }

            $result = $this->commentaireService->createCommentaire($videoId, $userId, $content);

            if (!$result['success']) {
                JsonResponse::notFound(['error' => $result['message']]);
            }

            $this->auditService->logSecurityEvent($userId, 'comment_created', [
                'video_id' => $videoId,
                'comment_id' => $result['comment']['id'] ?? null
            ]);

            JsonResponse::created([
                'message' => 'Commentaire ajouté',
                'comment' => $result['comment']
            ]);

        } catch (\Exception $e) {
            error_log("CommentaireController::create - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function delete(int $commentId): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
            }

            $userId = $this->authMiddleware->getUserId();

            $result = $this->commentaireService->deleteCommentaire($commentId, $userId);

            if (!$result['success']) {
                if ($result['code'] === 403) {
                    JsonResponse::forbidden(['error' => $result['message']]);
                } elseif ($result['code'] === 404) {
                    JsonResponse::notFound(['error' => $result['message']]);
                } else {
                    JsonResponse::serverError(['error' => $result['message']]);
                }
            }

            $this->auditService->logSecurityEvent($userId, 'comment_deleted', [
                'comment_id' => $commentId
            ]);

            JsonResponse::success(['message' => 'Commentaire supprimé']);

        } catch (\Exception $e) {
            error_log("CommentaireController::delete - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function reply(int $commentId): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
            }

            $userId = $this->authMiddleware->getUserId();

            $rawInput = file_get_contents('php://input');
            $data = json_decode($rawInput, true) ?? [];

            $content = SecurityHelper::sanitizeInput($data['content'] ?? '');

            if (empty($content)) {
                JsonResponse::badRequest(['error' => 'Contenu de la réponse requis']);
            }

            if (strlen($content) > 2000) {
                JsonResponse::badRequest(['error' => 'Réponse trop longue (max 2000 caractères)']);
            }

            $comment = $this->db->fetchOne(
                "SELECT id, video_id FROM comments WHERE id = $1 AND deleted_at IS NULL",
                [$commentId]
            );

            if (!$comment) {
                JsonResponse::notFound(['error' => 'Commentaire non trouvé']);
            }

            $replyId = $this->db->execute(
                "INSERT INTO comment_replies (comment_id, user_id, content, created_at) 
                 VALUES ($1, $2, $3, NOW()) RETURNING id",
                [$commentId, $userId, $content]
            );

            $this->auditService->logSecurityEvent($userId, 'comment_reply_created', [
                'comment_id' => $commentId,
                'reply_id' => $replyId
            ]);

            JsonResponse::created([
                'message' => 'Réponse ajoutée',
                'reply_id' => $replyId
            ]);

        } catch (\Exception $e) {
            error_log("CommentaireController::reply - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function getReplies(int $commentId): void
    {
        try {
            $replies = $this->db->fetchAll(
                "SELECT cr.*, u.username, u.id as user_id
                 FROM comment_replies cr
                 JOIN users u ON cr.user_id = u.id
                 WHERE cr.comment_id = $1 AND cr.deleted_at IS NULL
                 ORDER BY cr.created_at ASC",
                [$commentId]
            );

            JsonResponse::success(['replies' => $replies]);

        } catch (\Exception $e) {
            error_log("CommentaireController::getReplies - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function likeComment(int $commentId): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
            }

            $userId = $this->authMiddleware->getUserId();

            $existing = $this->db->fetchOne(
                "SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
                [$commentId, $userId]
            );

            if ($existing) {
                $this->db->execute(
                    "DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
                    [$commentId, $userId]
                );
                JsonResponse::success(['message' => 'Like retiré', 'liked' => false]);
            } else {
                $this->db->execute(
                    "INSERT INTO comment_likes (comment_id, user_id, created_at) VALUES ($1, $2, NOW())",
                    [$commentId, $userId]
                );
                JsonResponse::success(['message' => 'Commentaire liké', 'liked' => true]);
            }

        } catch (\Exception $e) {
            error_log("CommentaireController::likeComment - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function getLikeStatus(int $commentId): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::success(['liked' => false, 'like_count' => 0]);
            }

            $userId = $this->authMiddleware->getUserId();

            $liked = $this->db->fetchOne(
                "SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2",
                [$commentId, $userId]
            );

            $count = $this->db->fetchOne(
                "SELECT COUNT(*) as total FROM comment_likes WHERE comment_id = $1",
                [$commentId]
            );

            JsonResponse::success([
                'liked' => $liked !== null,
                'like_count' => (int)($count['total'] ?? 0)
            ]);

        } catch (\Exception $e) {
            error_log("CommentaireController::getLikeStatus - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function likeReply(int $replyId): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
            }

            $userId = $this->authMiddleware->getUserId();

            $existing = $this->db->fetchOne(
                "SELECT id FROM reply_likes WHERE reply_id = $1 AND user_id = $2",
                [$replyId, $userId]
            );

            if ($existing) {
                $this->db->execute(
                    "DELETE FROM reply_likes WHERE reply_id = $1 AND user_id = $2",
                    [$replyId, $userId]
                );
                JsonResponse::success(['message' => 'Like retiré', 'liked' => false]);
            } else {
                $this->db->execute(
                    "INSERT INTO reply_likes (reply_id, user_id, created_at) VALUES ($1, $2, NOW())",
                    [$replyId, $userId]
                );
                JsonResponse::success(['message' => 'Réponse likée', 'liked' => true]);
            }

        } catch (\Exception $e) {
            error_log("CommentaireController::likeReply - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function getReplyLikeStatus(int $replyId): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::success(['liked' => false, 'like_count' => 0]);
            }

            $userId = $this->authMiddleware->getUserId();

            $liked = $this->db->fetchOne(
                "SELECT id FROM reply_likes WHERE reply_id = $1 AND user_id = $2",
                [$replyId, $userId]
            );

            $count = $this->db->fetchOne(
                "SELECT COUNT(*) as total FROM reply_likes WHERE reply_id = $1",
                [$replyId]
            );

            JsonResponse::success([
                'liked' => $liked !== null,
                'like_count' => (int)($count['total'] ?? 0)
            ]);

        } catch (\Exception $e) {
            error_log("CommentaireController::getReplyLikeStatus - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }
}