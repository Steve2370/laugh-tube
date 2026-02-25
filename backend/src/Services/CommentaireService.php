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