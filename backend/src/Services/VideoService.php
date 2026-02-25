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
}