<?php

namespace App\Controllers;

use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthMiddleware;
use App\Models\Video;
use App\Services\AnalyticsService;
use App\Services\AuditService;
use App\Services\VideoService;
use App\Utils\JsonResponse;
use App\Utils\SecurityHelper;

class VideoController
{
    public function __construct(
        private VideoService $videoService,
        private Video $videoModel,
        private AnalyticsService $analyticsService,
        private AuthMiddleware $authMiddleware,
        private AuditService $auditService,
        private DatabaseInterface $db
    ) {}

    public function upload(): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
                return;
            }

            $userId = $this->authMiddleware->getUserId();

            if (!isset($_FILES['video']) || $_FILES['video']['error'] !== UPLOAD_ERR_OK) {
                JsonResponse::badRequest(['error' => 'Fichier vidéo manquant']);
                return;
            }

            $file = $_FILES['video'];

            $allowedMimes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
            $maxSize = 500 * 1024 * 1024;

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $file['tmp_name']);
            finfo_close($finfo);

            if (!in_array($mimeType, $allowedMimes, true)) {
                JsonResponse::badRequest(['error' => 'Format vidéo invalide (MP4, WebM, OGG, MOV, AVI, MKV uniquement)']);
                return;
            }

            if ($file['size'] > $maxSize) {
                JsonResponse::badRequest(['error' => 'Fichier trop volumineux (max 500MB)']);
                return;
            }

            $title = SecurityHelper::sanitizeInput($_POST['title'] ?? '');
            $description = SecurityHelper::sanitizeInput($_POST['description'] ?? '');

            if (empty(trim($title))) {
                JsonResponse::badRequest(['error' => 'Titre obligatoire']);
                return;
            }

            $result = $this->videoService->createVideo($userId, $title, $description, $file);

            if (!$result['success']) {
                $code = $result['code'] ?? 500;
                http_response_code($code);
                JsonResponse::sendWithCors(['error' => $result['message'] ?? 'Erreur lors de la création'], $code);
                return;
            }
            $this->auditService->logSecurityEvent($userId, 'video_uploaded', [
                'video_id' => $result['data']['video_id'] ?? null,
                'title' => $title,
                'filename' => $result['data']['filename'] ?? null
            ]);

            JsonResponse::created([
                'message' => 'Vidéo uploadée avec succès',
                'video_id' => $result['data']['video_id'],
                'filename' => $result['data']['filename']
            ]);

        } catch (\Exception $e) {
            error_log("VideoController::upload - Error: " . $e->getMessage());
            error_log("VideoController::upload - Stack: " . $e->getTraceAsString());
            JsonResponse::serverError(['error' => 'Erreur lors de l\'upload']);
        }
    }

    public function list(): void
    {
        try {
            $result = $this->videoService->getPublicVideos();
            JsonResponse::success(['videos' => $result]);

        } catch (\Exception $e) {
            error_log("VideoController::list - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function getVideo(int $videoId): void
    {
        try {
            $result = $this->videoService->getVideoDetails($videoId);

            if (!$result['success']) {
                JsonResponse::notFound(['error' => 'Vidéo non trouvée']);
            }

            JsonResponse::success(['video' => $result['data']]);

        } catch (\Exception $e) {
            error_log("VideoController::getVideo - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function delete(int $videoId): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
            }

            $userId = $this->authMiddleware->getUserId();

            $result = $this->videoService->deleteVideo($videoId, $userId);

            if (!$result['success']) {
                if ($result['code'] === 403) {
                    JsonResponse::forbidden(['error' => $result['message']]);
                } elseif ($result['code'] === 404) {
                    JsonResponse::notFound(['error' => $result['message']]);
                } else {
                    JsonResponse::serverError(['error' => $result['message']]);
                }
            }

            $this->auditService->logSecurityEvent($userId, 'video_deleted', ['video_id' => $videoId]);

            JsonResponse::success(['message' => 'Vidéo supprimée']);

        } catch (\Exception $e) {
            error_log("VideoController::delete - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function recordView(int $videoId): void
    {
        try {
            $this->authMiddleware->handleOptional();
            $userId = $this->authMiddleware->getUserId();

            $rawInput = file_get_contents('php://input');
            $data = json_decode($rawInput, true) ?? [];

            $viewData = [
                'user_id' => $userId,
                'session_id' => SecurityHelper::sanitizeInput($data['sessionId'] ?? ''),
                'watch_time' => (int)($data['watchTime'] ?? 0),
                'watch_percentage' => (float)($data['watchPercentage'] ?? 0.0),
                'completed' => (bool)($data['completed'] ?? false),
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null
            ];

            $result = $this->analyticsService->recordView($videoId, $viewData);

            if (!$result['success']) {
                $code = $result['code'] ?? 400;
                http_response_code($code);
                echo json_encode(['error' => $result['message']]);
                return;
            }

            JsonResponse::success(['message' => 'Vue enregistrée']);

        } catch (\Exception $e) {
            error_log("VideoController::recordView - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function getAnalytics(int $videoId): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
            }

            $userId = $this->authMiddleware->getUserId();
            $period = SecurityHelper::sanitizeInput($_GET['period'] ?? '7d');

            $result = $this->analyticsService->getVideoAnalytics($videoId, $userId, $period);

            if (!$result['success']) {
                if ($result['code'] === 403) {
                    JsonResponse::forbidden(['error' => $result['message']]);
                } elseif ($result['code'] === 404) {
                    JsonResponse::notFound(['error' => $result['message']]);
                } else {
                    JsonResponse::serverError(['error' => $result['message']]);
                }
            }

            JsonResponse::success(['analytics' => $result['data']]);

        } catch (\Exception $e) {
            error_log("VideoController::getAnalytics - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function trending(): void
    {
        try {
            $limit = (int)($_GET['limit'] ?? 10);
            $period = (int)($_GET['period'] ?? 7);

            $videos = $this->db->fetchAll(
                "SELECT v.*, u.username, 
                        COUNT(DISTINCT vv.id) as view_count
                 FROM videos v
                 LEFT JOIN users u ON v.user_id = u.id
                 LEFT JOIN video_views vv ON v.id = vv.video_id 
                     AND vv.created_at >= NOW() - INTERVAL '$period days'
                 WHERE v.deleted_at IS NULL
                 GROUP BY v.id, u.username
                 ORDER BY view_count DESC
                 LIMIT $1",
                [$limit]
            );

            JsonResponse::success(['videos' => $videos]);

        } catch (\Exception $e) {
            error_log("VideoController::trending - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function userVideos(int $userId): void
    {
        try {
            $videos = $this->db->fetchAll(
                "SELECT v.*, COUNT(DISTINCT vv.id) as view_count
                 FROM videos v
                 LEFT JOIN video_views vv ON v.id = vv.video_id
                 WHERE v.user_id = $1 AND v.deleted_at IS NULL
                 GROUP BY v.id
                 ORDER BY v.created_at DESC",
                [$userId]
            );

            JsonResponse::success(['videos' => $videos]);

        } catch (\Exception $e) {
            error_log("VideoController::userVideos - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function getViews(int $videoId): void
    {
        try {
            $video = $this->db->fetchOne(
                "SELECT id FROM videos WHERE id = $1 AND deleted_at IS NULL",
                [$videoId]
            );

            if (!$video) {
                JsonResponse::notFound(['error' => 'Vidéo non trouvée']);
            }

            $viewCount = $this->db->fetchOne(
                "SELECT COUNT(DISTINCT id) as total FROM video_views WHERE video_id = $1",
                [$videoId]
            );

            JsonResponse::success([
                'video_id' => $videoId,
                'view_count' => (int)($viewCount['total'] ?? 0)
            ]);

        } catch (\Exception $e) {
            error_log("VideoController::getViews - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function checkViewed(int $videoId): void
    {
        try {
            $this->authMiddleware->handleOptional();
            $userId = $this->authMiddleware->getUserId();

            $sessionId = SecurityHelper::sanitizeInput($_GET['sessionId'] ?? '');

            if (!$userId && !$sessionId) {
                JsonResponse::badRequest(['error' => 'User ID ou Session ID requis']);
            }

            $query = $userId
                ? "SELECT id FROM video_views WHERE video_id = $1 AND user_id = $2 LIMIT 1"
                : "SELECT id FROM video_views WHERE video_id = $1 AND session_id = $2 LIMIT 1";

            $params = $userId ? [$videoId, $userId] : [$videoId, $sessionId];

            $viewed = $this->db->fetchOne($query, $params);

            JsonResponse::success(['viewed' => $viewed !== null]);

        } catch (\Exception $e) {
            error_log("VideoController::checkViewed - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function cleanupSessions(): void
    {
        try {
            if (!$this->authMiddleware->handle()) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
            }

            if (!$this->authMiddleware->isAdmin()) {
                JsonResponse::forbidden(['error' => 'Accès refusé']);
            }

            $deleted = $this->db->execute(
                "DELETE FROM video_views 
                 WHERE session_id IS NOT NULL 
                 AND user_id IS NULL 
                 AND created_at < NOW() - INTERVAL '30 days'"
            );

            JsonResponse::success([
                'message' => 'Sessions nettoyées',
                'deleted_count' => $deleted
            ]);

        } catch (\Exception $e) {
            error_log("VideoController::cleanupSessions - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function expose(int $videoId): void
    {
        try {
            $result = $this->videoService->getVideoDetails($videoId);

            if (!$result['success']) {
                http_response_code($result['code'] ?? 404);
                echo json_encode([
                    'success' => false,
                    'error' => $result['message'] ?? 'Vidéo non trouvée'
                ]);
                return;
            }

            http_response_code(200);
            echo json_encode($result);

        } catch (\Exception $e) {
            error_log("VideoController::expose - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur serveur'
            ]);
        }
    }

    public function incrementView(int $videoId): void
    {
        try {
            $video = $this->videoModel->findById($videoId);

            if (!$video) {
                JsonResponse::notFound([
                    'success' => false,
                    'error' => 'Vidéo introuvable'
                ]);
                return;
            }

            if (!empty($video['deleted_at'])) {
                JsonResponse::notFound([
                    'success' => false,
                    'error' => 'Vidéo supprimée'
                ]);
                return;
            }

            $this->videoModel->incrementViews($videoId);

            $updatedVideo = $this->videoModel->findById($videoId);
            $this->auditService->logSecurityEvent(
                null,
                'video_view_increment',
                [
                    'video_id' => $videoId,
                    'new_views' => (int)$updatedVideo['views']
                ]
            );

            JsonResponse::success([
                'success' => true,
                'message' => 'Vue enregistrée avec succès',
                'data' => [
                    'video_id' => $videoId,
                    'views' => (int)$updatedVideo['views'],
                    'unique_views' => (int)$updatedVideo['unique_views']
                ]
            ]);

        } catch (\Exception $e) {
            error_log('VideoController::incrementView - Error: ' . $e->getMessage());
            error_log('VideoController::incrementView - Stack: ' . $e->getTraceAsString());

            JsonResponse::serverError([
                'success' => false,
                'error' => 'Erreur lors de l\'enregistrement de la vue'
            ]);
        }
    }

    public function getThumbnail(int $videoId): void
    {
        try {
            $video = $this->videoModel->findById($videoId);

            if (!$video) {
                $this->servePlaceholderImage('video');
                return;
            }

            if (!empty($video['deleted_at'])) {
                $this->servePlaceholderImage('video');
                return;
            }

            $basePath = '/var/www/html/public/uploads/thumbnails/';

            if (!empty($video['thumbnail'])) {
                $thumbnailFilename = basename($video['thumbnail']);
                $possiblePaths = [
                    $basePath . $thumbnailFilename,
                    $basePath . $videoId . '.jpg',
                    $basePath . $videoId . '.jpeg',
                    $basePath . $videoId . '.png',
                    $basePath . $videoId . '.webp',
                ];
            } else {
                $possiblePaths = [
                    $basePath . $videoId . '.jpg',
                    $basePath . $videoId . '.jpeg',
                    $basePath . $videoId . '.png',
                    $basePath . $videoId . '.webp',
                ];
            }

            $thumbnailPath = null;
            foreach ($possiblePaths as $path) {
                if (file_exists($path) && is_readable($path)) {
                    $thumbnailPath = $path;
                    break;
                }
            }

            if (!$thumbnailPath) {
                error_log("VideoController::getThumbnail - No thumbnail found for video $videoId in $basePath");
                $this->servePlaceholderImage('video');
                return;
            }

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $thumbnailPath);
            finfo_close($finfo);

            if (!str_starts_with($mimeType, 'image/')) {
                $mimeType = 'image/jpeg';
            }

            header('Content-Type: ' . $mimeType);
            header('Content-Length: ' . filesize($thumbnailPath));
            header('Cache-Control: public, max-age=86400');
            header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 86400) . ' GMT');
            header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($thumbnailPath)) . ' GMT');

            $etag = md5_file($thumbnailPath);
            header('ETag: "' . $etag . '"');

            if (isset($_SERVER['HTTP_IF_NONE_MATCH']) &&
                trim($_SERVER['HTTP_IF_NONE_MATCH'], '"') === $etag) {
                http_response_code(304);
                exit;
            }

            readfile($thumbnailPath);
            exit;

        } catch (\Exception $e) {
            error_log('VideoController::getThumbnail - Error: ' . $e->getMessage());
            error_log('VideoController::getThumbnail - Stack: ' . $e->getTraceAsString());
            $this->servePlaceholderImage('video');
        }
    }

    private function servePlaceholderImage(string $type = 'video'): void
    {
        $placeholders = [
            'video' => '/var/www/html/public/images/placeholder-video.png',
            'profile' => '/var/www/html/public/images/default-avatar.png',
            'cover' => '/var/www/html/public/images/default-cover.png',
        ];

        $placeholderPath = $placeholders[$type] ?? $placeholders['video'];

        if (!file_exists($placeholderPath)) {
            header('Content-Type: image/png');
            header('Cache-Control: public, max-age=3600');

            $width = $type === 'video' ? 640 : 200;
            $height = $type === 'video' ? 360 : 200;

            $image = imagecreatetruecolor($width, $height);
            $gray = imagecolorallocate($image, 200, 200, 200);
            imagefill($image, 0, 0, $gray);

            imagepng($image);
            imagedestroy($image);
            exit;
        }

        header('Content-Type: image/png');
        header('Content-Length: ' . filesize($placeholderPath));
        header('Cache-Control: public, max-age=3600');
        readfile($placeholderPath);
        exit;
    }
}