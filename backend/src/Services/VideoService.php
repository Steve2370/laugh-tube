<?php

namespace App\Services;

use App\Interfaces\DatabaseInterface;
use App\Models\Video;
use App\Models\Commentaire;
use App\Models\Reaction;
use App\Utils\SecurityHelper;
use PDO;

class VideoService
{
    public function __construct(
        private Video $videoModel,
        private Commentaire $commentaireModel,
        private Reaction $reactionModel,
        private DatabaseInterface $db,
        private ValidationService $validationService,
        private AuditService $auditService,
        private ?NotificationCreationService $notificationCreator = null,
        private ?UploadService $uploadService = null
    ) {}

    public function createVideo(int $userId, string $title, string $description, array $file): array
    {
        return $this->creationVideo($userId, $title, $description, $file);
    }

    public function creationVideo(int $userId, string $title, string $description, $filenameOrFile): array
    {
        try {
            error_log("VideoService::creationVideo - START - userId: $userId, title: $title");

            $title = SecurityHelper::sanitizeInput(trim($title));
            $description = SecurityHelper::sanitizeInput(trim($description));

            $errors = $this->validationService->validateVideoMetadata($title, $description);

            if (!empty($errors)) {
                error_log("VideoService::creationVideo - Validation errors: " . json_encode($errors));
                return [
                    'success' => false,
                    'errors' => $errors,
                    'code' => 400
                ];
            }

            $filename = $filenameOrFile;

            if (is_array($filenameOrFile) && $this->uploadService) {
                error_log("VideoService::creationVideo - Uploading file...");
                $uploadResult = $this->uploadService->uploadVideo($filenameOrFile, $userId);

                if (!$uploadResult['success']) {
                    error_log("VideoService::creationVideo - Upload failed: " . json_encode($uploadResult));
                    return $uploadResult;
                }

                $filename = $uploadResult['filename'];
                error_log("VideoService::creationVideo - File uploaded: $filename");
            }

            error_log("VideoService::creationVideo - Creating video record with userId: $userId");
            $videoId = $this->videoModel->create($userId, $title, $description, $filename);

            if ($videoId === null) {
                error_log("VideoService::creationVideo - CRITICAL: videoModel->create returned NULL");
                return [
                    'success' => false,
                    'message' => 'Échec de la création de la vidéo en base de données',
                    'code' => 500
                ];
            }

            error_log("VideoService::creationVideo - Video created with ID: $videoId");

            if ($this->notificationCreator) {
                try {
                    error_log("VideoService::creationVideo - Sending notification for videoId: $videoId");
                    $this->notificationCreator->notifyVideoUpload($userId, $videoId, $title, $filename);
                } catch (\Exception $e) {
                    error_log("VideoService::creationVideo - Notification error: " . $e->getMessage());
                }
            }

            $this->auditService->logSecurityEvent(
                $userId,
                'video_uploaded',
                [
                    'video_id' => $videoId,
                    'title' => $title,
                    'filename' => $filename
                ]
            );

            error_log("VideoService::creationVideo - SUCCESS - videoId: $videoId");

            return [
                'success' => true,
                'data' => [
                    'message' => 'Vidéo enregistrée avec succès',
                    'video_id' => $videoId,
                    'filename' => $filename
                ]
            ];

        } catch (\Exception $e) {
            error_log("VideoService::creationVideo - EXCEPTION: " . $e->getMessage());
            error_log("VideoService::creationVideo - Stack trace: " . $e->getTraceAsString());

            return [
                'success' => false,
                'message' => 'Erreur lors de la création de la vidéo: ' . $e->getMessage(),
                'code' => 500
            ];
        }
    }

    public function getPublicVideos(): array
    {
        try {
            $videos = $this->videoModel->findAllPublic();

            foreach ($videos as &$video) {
                $video['likes'] = $this->reactionModel->countLikes($video['id']);
                $video['dislikes'] = $this->reactionModel->countDislikes($video['id']);
                $video['commentaires'] = $this->commentaireModel->countByVideo($video['id']);
                $video['comments'] = $video['commentaires'];
                $video['views'] = (int)$video['views'];
                $video['unique_views'] = (int)$video['unique_views'];
            }

            return [
                'success' => true,
                'videos' => $videos,
                'count' => count($videos)
            ];

        } catch (\Exception $e) {
            error_log("VideoService::getPublicVideos - Error: " . $e->getMessage());

            return [
                'success' => false,
                'videos' => [],
                'count' => 0
            ];
        }
    }

    public function getVideoDetails(int $videoId): array
    {
        return $this->getVideoWithComments($videoId);
    }

    public function getVideoWithComments(int $videoId): array
    {
        try {
            $video = $this->videoModel->findById($videoId);

            if (!$video) {
                return [
                    'success' => false,
                    'message' => 'Vidéo introuvable',
                    'code' => 404
                ];
            }

            $video['views'] = (int)$video['views'];
            $video['unique_views'] = (int)$video['unique_views'];
            $video['likes'] = $this->reactionModel->countLikes($videoId);
            $video['dislikes'] = $this->reactionModel->countDislikes($videoId);
            $video['commentaires'] = $this->commentaireModel->findByVideo($videoId);
            $video['comments'] = $video['commentaires'];

            return [
                'success' => true,
                'video' => $video,
                'commentaires' => $video['commentaires']
            ];

        } catch (\Exception $e) {
            error_log("VideoService::getVideoWithComments - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la récupération',
                'code' => 500
            ];
        }
    }

    public function getUserVideos(int $userId): array
    {
        try {
            $videos = $this->videoModel->findByUser($userId);

            foreach ($videos as &$video) {
                $video['views']       = (int)$video['views'];
                $video['unique_views'] = (int)($video['unique_views'] ?? 0);
                $video['likes']    = isset($video['likes']) && $video['likes'] !== null
                    ? (int)$video['likes']
                    : $this->reactionModel->countLikes($video['id']);
                $video['dislikes'] = isset($video['dislikes']) && $video['dislikes'] !== null
                    ? (int)$video['dislikes']
                    : $this->reactionModel->countDislikes($video['id']);
                $video['comments'] = isset($video['comments']) && $video['comments'] !== null
                    ? (int)$video['comments']
                    : $this->commentaireModel->countByVideo($video['id']);
            }

            return [
                'success' => true,
                'videos' => $videos,
                'count' => count($videos)
            ];

        } catch (\Exception $e) {
            error_log("VideoService::getUserVideos - Error: " . $e->getMessage());

            return [
                'success' => false,
                'videos' => [],
                'count' => 0
            ];
        }
    }

    public function deleteVideo(int $videoId, int $userId): array
    {
        try {
            $video = $this->videoModel->getMetadata($videoId);

            if (!$video) {
                return [
                    'success' => false,
                    'message' => 'Vidéo introuvable',
                    'code' => 404
                ];
            }

            if ($video['user_id'] != $userId) {
                return [
                    'success' => false,
                    'message' => 'Vous n\'êtes pas autorisé à supprimer cette vidéo',
                    'code' => 403
                ];
            }

            $this->videoModel->delete($videoId);

            if ($this->uploadService) {
                if (!empty($video['filename'])) {
                    $this->uploadService->deleteFile($video['filename'], 'video');
                }
                if (!empty($video['thumbnail'])) {
                    $this->uploadService->deleteFile($video['thumbnail'], 'thumbnail');
                }
            }

            $this->auditService->logSecurityEvent(
                $userId,
                'video_deleted',
                [
                    'video_id' => $videoId,
                    'title' => $video['title'] ?? 'Unknown'
                ]
            );

            return [
                'success' => true,
                'message' => 'Vidéo supprimée avec succès',
                'videoFiles' => [
                    'filename' => $video['filename'] ?? null,
                    'thumbnail' => $video['thumbnail'] ?? null
                ]
            ];

        } catch (\Exception $e) {
            error_log("VideoService::deleteVideo - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la suppression',
                'code' => 500
            ];
        }
    }

    public function recordView(
        int $videoId,
        ?int $userId,
        ?string $sessionId,
        int $watchTime = 0,
        float $watchPercentage = 0.0,
        bool $completed = false
    ): array {
        try {
            $video = $this->videoModel->findById($videoId);

            if (!$video) {
                return [
                    'success' => false,
                    'message' => 'Vidéo introuvable',
                    'alreadyViewed' => false,
                    'code' => 404
                ];
            }

            if ($userId !== null) {
                $checkSql = "SELECT COUNT(*) as count FROM video_views WHERE video_id = ? AND user_id = ?";
                $existing = $this->db->fetchOne($checkSql, [$videoId, $userId]);
            } else {
                $checkSql = "SELECT COUNT(*) as count FROM video_views WHERE video_id = ? AND session_id = ?";
                $existing = $this->db->fetchOne($checkSql, [$videoId, $sessionId]);
            }

            $alreadyViewed = (int)($existing['count'] ?? 0) > 0;

            if ($alreadyViewed) {
                if ($userId !== null) {
                    $updateSql = "UPDATE video_views SET watch_time = ?, watch_percentage = ?, completed = ?, viewed_at = NOW() WHERE video_id = ? AND user_id = ?";
                    $this->db->execute($updateSql, [$watchTime, $watchPercentage, $completed ? 1 : 0, $videoId, $userId]);
                } else {
                    $updateSql = "UPDATE video_views SET watch_time = ?, watch_percentage = ?, completed = ?, viewed_at = NOW() WHERE video_id = ? AND session_id = ?";
                    $this->db->execute($updateSql, [$watchTime, $watchPercentage, $completed ? 1 : 0, $videoId, $sessionId]);
                }

                return [
                    'success' => true,
                    'message' => 'Vue mise à jour',
                    'alreadyViewed' => true
                ];
            }

            $insertSql = "INSERT INTO video_views (video_id, user_id, session_id, watch_time, watch_percentage, completed, viewed_at)
                          VALUES (?, ?, ?, ?, ?, ?, NOW())";

            $this->db->execute($insertSql, [
                $videoId,
                $userId,
                $sessionId,
                $watchTime,
                $watchPercentage,
                $completed ? 1 : 0
            ]);

            $this->videoModel->incrementViews($videoId);

            return [
                'success' => true,
                'message' => 'Vue enregistrée avec succès',
                'alreadyViewed' => false
            ];

        } catch (\Exception $e) {
            error_log("VideoService::recordView - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de l\'enregistrement',
                'alreadyViewed' => false,
                'code' => 500
            ];
        }
    }

    public function getTrendingVideos(int $limit = 10, int $period = 7): array
    {
        try {
            $limit = min(max(1, $limit), 50);
            $period = min(max(1, $period), 30);

            $sql = "SELECT v.*, u.username,
                           COUNT(DISTINCT vv.id) as recent_views,
                           COUNT(DISTINCT r.id) FILTER (WHERE r.reaction_type = 'like') as likes,
                           COUNT(DISTINCT r.id) FILTER (WHERE r.reaction_type = 'dislike') as dislikes
                    FROM videos v
                    LEFT JOIN users u ON v.user_id = u.id
                    LEFT JOIN video_views vv ON v.id = vv.video_id 
                        AND vv.viewed_at > NOW() - INTERVAL '$1 days'
                    LEFT JOIN reactions r ON v.id = r.video_id
                    WHERE v.deleted_at IS NULL
                    GROUP BY v.id, u.username
                    ORDER BY recent_views DESC, likes DESC
                    LIMIT $2";

            $videos = $this->db->fetchAll($sql, [$period, $limit]);

            return [
                'success' => true,
                'videos' => $videos,
                'count' => count($videos),
                'period' => $period
            ];

        } catch (\Exception $e) {
            error_log("VideoService::getTrendingVideos - Error: " . $e->getMessage());

            return [
                'success' => false,
                'videos' => [],
                'count' => 0
            ];
        }
    }

    public function updateMetadata(int $videoId, int $userId, string $title, ?string $description = null): array
    {
        try {
            $video = $this->videoModel->findById($videoId);

            if (!$video || $video['user_id'] != $userId) {
                return [
                    'success' => false,
                    'message' => 'Vidéo introuvable ou accès refusé',
                    'code' => 403
                ];
            }

            $errors = $this->validationService->validateVideoMetadata($title, $description);

            if (!empty($errors)) {
                return [
                    'success' => false,
                    'errors' => $errors,
                    'code' => 400
                ];
            }

            $sql = "UPDATE videos 
                    SET title = $1, description = $2, updated_at = NOW()
                    WHERE id = $3";

            $this->db->execute($sql, [$title, $description, $videoId]);

            return [
                'success' => true,
                'message' => 'Métadonnées mises à jour',
                'video' => [
                    'id' => $videoId,
                    'title' => $title,
                    'description' => $description
                ]
            ];

        } catch (\Exception $e) {
            error_log("VideoService::updateMetadata - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la mise à jour',
                'code' => 500
            ];
        }
    }

    public function searchVideos(string $query, int $limit = 20, int $offset = 0): array
    {
        try {
            $query = SecurityHelper::sanitizeInput(trim($query));

            if (strlen($query) < 2) {
                return [
                    'success' => false,
                    'message' => 'Requête trop courte (min 2 caractères)',
                    'code' => 400
                ];
            }

            $limit = min(max(1, $limit), 100);
            $offset = max(0, $offset);

            $searchPattern = '%' . $query . '%';

            $sql = "SELECT v.*, u.username
                    FROM videos v
                    LEFT JOIN users u ON v.user_id = u.id
                    WHERE v.deleted_at IS NULL
                    AND (v.title ILIKE $1 OR v.description ILIKE $1)
                    ORDER BY v.created_at DESC
                    LIMIT $2 OFFSET $3";

            $videos = $this->db->fetchAll($sql, [$searchPattern, $limit, $offset]);

            return [
                'success' => true,
                'videos' => $videos,
                'count' => count($videos),
                'query' => $query
            ];

        } catch (\Exception $e) {
            error_log("VideoService::searchVideos - Error: " . $e->getMessage());

            return [
                'success' => false,
                'videos' => [],
                'count' => 0
            ];
        }
    }
}