<?php

namespace App\Controllers;

use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthAide;
use App\Middleware\AuthMiddleware;
use App\Services\AbonnementService;
use App\Services\UploadService;
use App\Utils\JsonResponse;
use App\Models\User;

class UserController
{
    private $userService;
    private UploadService $uploadService;
    private User $userModel;
    private AbonnementService $abonnementService;
    private AuthMiddleware $authMiddleware;
    private DatabaseInterface $db;

    public function __construct($userService, $uploadService, $userModel, $abonnementService, $authMiddleware, $db)
    {
        $this->userService = $userService;
        $this->uploadService = $uploadService;
        $this->userModel = $userModel;
        $this->abonnementService = $abonnementService;
        $this->authMiddleware = $authMiddleware;
        $this->db = $db;
    }

    public function uploadAvatar(): void
    {
        try {
            $currentUser = $this->authMiddleware->handleOptional();

            if (!is_array($currentUser)) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
                return;
            }

            $userId = (int)($currentUser['sub'] ?? $currentUser['user_id'] ?? 0);
            if ($userId <= 0) {
                JsonResponse::unauthorized(['error' => 'ID utilisateur invalide']);
                return;
            }

            $file = $_FILES['avatar'] ?? $_FILES['photo_profil'] ?? $_FILES['profile-image'] ?? null;
            if ($file === null) {
                JsonResponse::badRequest(['error' => 'Aucun fichier fourni']);
                return;
            }

            if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
                JsonResponse::badRequest([
                    'error' => 'Fichier invalide ou upload échoué',
                    'code' => $file['error'] ?? -1
                ]);
                return;
            }

            $uploadResult = $this->uploadService->uploadImage($file, $userId, 'avatar');

            if (!is_array($uploadResult)) {
                JsonResponse::serverError(['error' => 'Erreur upload (service invalide)']);
                return;
            }

            if (!($uploadResult['success'] ?? false)) {
                JsonResponse::serverError(['error' => $uploadResult['message'] ?? 'Erreur upload']);
                return;
            }

            $filename = $uploadResult['filename'] ?? null;
            $path = $uploadResult['path'] ?? null;

            if (!$filename || !$path) {
                JsonResponse::serverError(['error' => 'Upload incomplet (filename/path manquant)']);
                return;
            }

            $ok = $this->userModel->updateProfileImage($userId, $filename);
            if (!$ok) {
                JsonResponse::serverError(['error' => 'Erreur mise à jour profil']);
                return;
            }

            JsonResponse::success([
                'message' => 'Avatar mis à jour',
                'avatar_url' => '/' . ltrim($path, '/'),
                'filename' => $filename
            ]);

        } catch (\Throwable $e) {
            error_log('Upload avatar error: ' . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur upload avatar']);
        }
    }

    public function getSubscribersCount(int $userId): void
    {
        try {
            $count = $this->abonnementService->getSubscribersCount($userId);

            JsonResponse::success([
                'count' => $count,
                'user_id' => $userId
            ]);

        } catch (\Exception $e) {
            error_log("UserController::getSubscribersCount - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function uploadCover(): void
    {
        try {
            $currentUser = $this->authMiddleware->handleOptional();

            if (!is_array($currentUser)) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
                return;
            }

            $userId = (int)($currentUser['sub'] ?? $currentUser['user_id'] ?? 0);
            if ($userId <= 0) {
                JsonResponse::unauthorized(['error' => 'ID utilisateur invalide']);
                return;
            }

            $file = $_FILES['cover'] ?? $_FILES['photo_couverture'] ?? null;
            if ($file === null) {
                JsonResponse::badRequest(['error' => 'Aucun fichier fourni']);
                return;
            }

            if (!isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
                JsonResponse::badRequest([
                    'error' => 'Fichier invalide ou upload échoué',
                    'code'  => $file['error'] ?? -1
                ]);
                return;
            }

            $uploadResult = $this->uploadService->uploadImage($file, $userId, 'cover');

            if (!is_array($uploadResult)) {
                JsonResponse::serverError(['error' => 'Erreur upload (service invalide)']);
                return;
            }

            if (!($uploadResult['success'] ?? false)) {
                JsonResponse::serverError(['error' => $uploadResult['message'] ?? 'Erreur upload']);
                return;
            }

            $filename = $uploadResult['filename'] ?? null;
            $path     = $uploadResult['path'] ?? null;

            if (!$filename || !$path) {
                JsonResponse::serverError(['error' => 'Upload incomplet (filename/path manquant)']);
                return;
            }

            $ok = $this->userModel->updateProfileCover($userId, $filename);
            if (!$ok) {
                JsonResponse::serverError(['error' => 'Erreur mise à jour couverture']);
                return;
            }

            JsonResponse::success([
                'message'   => 'Couverture mise à jour',
                'cover_url' => '/' . ltrim($path, '/'),
                'filename'  => $filename
            ]);

        } catch (\Throwable $e) {
            error_log('Upload cover error: ' . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur upload couverture']);
        }
    }


    public function updateProfile(): void
    {
        try {
            $currentUser = $this->authMiddleware->handleOptional();

            if (!is_array($currentUser)) {
                JsonResponse::unauthorized(['error' => 'Session expirée']);
                return;
            }

            $userId = (int)($currentUser['sub'] ?? $currentUser['user_id'] ?? 0);
            if ($userId <= 0) {
                JsonResponse::unauthorized(['error' => 'ID utilisateur invalide']);
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);
            if (!is_array($data)) {
                JsonResponse::badRequest(['error' => 'Données invalides']);
                return;
            }

            $allowedFields = ['username', 'email', 'bio', 'nom', 'prenom'];
            $updateData = [];

            foreach ($allowedFields as $field) {
                if (array_key_exists($field, $data)) {
                    $updateData[$field] = $data[$field];
                }
            }

            if (empty($updateData)) {
                JsonResponse::badRequest(['error' => 'Aucune donnée à mettre à jour']);
                return;
            }

            if (isset($updateData['username'])) {
                $u = trim((string)$updateData['username']);
                if (mb_strlen($u) < 3 || mb_strlen($u) > 30) {
                    JsonResponse::badRequest(['error' => "Le nom d'utilisateur doit contenir entre 3 et 30 caractères"]);
                    return;
                }
                $updateData['username'] = $u;
            }

            if (isset($updateData['email'])) {
                $email = trim((string)$updateData['email']);
                if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                    JsonResponse::badRequest(['error' => 'Email invalide']);
                    return;
                }
                $updateData['email'] = $email;
            }

            if (isset($updateData['bio'])) {
                $bio = trim((string)$updateData['bio']);
                if (mb_strlen($bio) > 500) {
                    JsonResponse::badRequest(['error' => 'La bio ne peut pas dépasser 500 caractères']);
                    return;
                }
                $updateData['bio'] = $bio;
            }

            $ok = $this->userModel->update($userId, $updateData);
            if (!$ok) {
                JsonResponse::serverError(['error' => 'Erreur lors de la mise à jour du profil']);
                return;
            }

            $updatedUser = $this->userModel->findById($userId);
            if (!$updatedUser) {
                JsonResponse::serverError(['error' => 'Utilisateur introuvable après mise à jour']);
                return;
            }

            JsonResponse::success([
                'message' => 'Profil mis à jour avec succès',
                'user' => [
                    'id'         => (int)$updatedUser['id'],
                    'username'   => $updatedUser['username'] ?? null,
                    'email'      => $updatedUser['email'] ?? null,
                    'bio'        => $updatedUser['bio'] ?? null,
                    'avatar_url' => $updatedUser['avatar_url'] ?? null,
                    'cover_url'  => $updatedUser['cover_url'] ?? null,
                    'photo_profil' => $updatedUser['photo_profil'] ?? null,
                ]
            ]);

        } catch (\Throwable $e) {
            error_log('Update profile error: ' . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur lors de la mise à jour du profil']);
        }
    }


    public function updateBio(): void
    {
        try {
            $currentUser = $this->authMiddleware->handleOptional();
            if (!is_array($currentUser)) {
                JsonResponse::unauthorized(['error' => 'Session expirée']);
                return;
            }

            $userId = (int)($currentUser['sub'] ?? $currentUser['user_id'] ?? 0);
            if ($userId <= 0) {
                JsonResponse::unauthorized(['error' => 'ID utilisateur invalide']);
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true);
            if (!is_array($data)) {
                JsonResponse::badRequest(['error' => 'Données invalides']);
                return;
            }

            $bio = $data['bio'] ?? null;
            if ($bio === null) {
                JsonResponse::badRequest(['error' => 'bio manquant']);
                return;
            }

            $bio = trim((string)$bio);

            if (mb_strlen($bio) > 500) {
                JsonResponse::badRequest(['error' => 'La bio ne peut pas dépasser 500 caractères']);
                return;
            }

            $ok = $this->userModel->update($userId, ['bio' => $bio]);

            if (!$ok) {
                JsonResponse::serverError(['error' => 'Erreur lors de la mise à jour de la bio']);
                return;
            }

            JsonResponse::success([
                'message' => 'Bio mise à jour',
                'bio'     => $bio
            ]);

        } catch (\Throwable $e) {
            error_log('Update bio error: ' . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur lors de la mise à jour de la bio']);
        }
    }

    public function getStats(int $userId)
    {
        try {
            $stats = $this->userService->getUserStats($userId);

            JsonResponse::success([
                'stats' => $stats
            ]);

        } catch (\Exception $e) {
            error_log('Get stats error: ' . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur lors de la récupération des statistiques']);
        }
    }

    public function getProfile(int $userId)
    {
        try {
            $profile = $this->userService->getUserProfile($userId);

            if (!$profile) {
                JsonResponse::notFound(['error' => 'Utilisateur non trouvé']);
                return;
            }

            JsonResponse::success([
                'profile' => $profile
            ]);

        } catch (\Exception $e) {
            error_log('Get profile error: ' . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur lors de la récupération du profil']);
        }
    }

    public function getWatchHistory(int $userId)
    {
        try {
            $user = AuthAide::optionalAuth();

            if (!$user || $user['sub'] != $userId) {
                JsonResponse::forbidden(['error' => 'Accès non autorisé']);
                return;
            }

            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
            $offset = isset($_GET['offset']) ? (int)$_GET['offset'] : 0;

            $history = $this->userService->getWatchHistory($userId, $limit, $offset);

            JsonResponse::success([
                'history' => $history,
                'limit' => $limit,
                'offset' => $offset
            ]);

        } catch (\Exception $e) {
            error_log('Get watch history error: ' . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur lors de la récupération de l\'historique']);
        }
    }

    public function serveAvatar(string $filename)
    {
        try {
            $imagePath = __DIR__ . '/../../uploads/avatars/' . $filename;

            if (!file_exists($imagePath)) {
                http_response_code(404);
                header('Content-Type: image/svg+xml');
                echo '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#ccc" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#666" font-size="40">?</text></svg>';
                return;
            }

            $allowedPath = realpath(__DIR__ . '/../../uploads/avatars/');
            $requestedPath = realpath($imagePath);

            if (strpos($requestedPath, $allowedPath) !== 0) {
                http_response_code(403);
                return;
            }

            $mimeType = mime_content_type($imagePath);
            $allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

            if (!in_array($mimeType, $allowedTypes)) {
                http_response_code(403);
                return;
            }

            header('Content-Type: ' . $mimeType);
            header('Content-Length: ' . filesize($imagePath));
            header('Cache-Control: public, max-age=31536000');
            header('X-Content-Type-Options: nosniff');
            readfile($imagePath);

        } catch (\Exception $e) {
            error_log('Serve avatar error: ' . $e->getMessage());
            http_response_code(500);
        }
    }

    public function serveProfile(string $filename)
    {
        try {
            $imagePath = __DIR__ . '/../../uploads/profiles/' . $filename;

            if (!file_exists($imagePath)) {
                http_response_code(404);
                header('Content-Type: image/svg+xml');
                echo '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#ccc" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#666" font-size="40">?</text></svg>';
                return;
            }

            $allowedPath = realpath(__DIR__ . '/../../uploads/profiles/');
            $requestedPath = realpath($imagePath);

            if (strpos($requestedPath, $allowedPath) !== 0) {
                http_response_code(403);
                return;
            }

            $mimeType = mime_content_type($imagePath);
            $allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

            if (!in_array($mimeType, $allowedTypes)) {
                http_response_code(403);
                return;
            }

            header('Content-Type: ' . $mimeType);
            header('Content-Length: ' . filesize($imagePath));
            header('Cache-Control: public, max-age=31536000');
            header('X-Content-Type-Options: nosniff');
            readfile($imagePath);

        } catch (\Exception $e) {
            error_log('Serve profile error: ' . $e->getMessage());
            http_response_code(500);
        }
    }

    public function serveCover(string $filename): void
    {
        try {
            $filename = basename($filename);
            $coverPath = __DIR__ . '/../../uploads/covers/' . $filename;

            if (!file_exists($coverPath) || !is_readable($coverPath)) {
                $this->servePlaceholderImage('cover');
                return;
            }

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $coverPath);
            finfo_close($finfo);

            if (!str_starts_with($mimeType, 'image/')) {
                $this->servePlaceholderImage('cover');
                return;
            }

            header('Content-Type: ' . $mimeType);
            header('Content-Length: ' . filesize($coverPath));
            header('Cache-Control: public, max-age=86400');
            header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 86400) . ' GMT');
            header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($coverPath)) . ' GMT');

            $etag = md5_file($coverPath);
            header('ETag: "' . $etag . '"');

            if (isset($_SERVER['HTTP_IF_NONE_MATCH']) &&
                trim($_SERVER['HTTP_IF_NONE_MATCH'], '"') === $etag) {
                http_response_code(304);
                exit;
            }

            readfile($coverPath);
            exit;

        } catch (\Exception $e) {
            error_log('UserController::serveCover - Error: ' . $e->getMessage());
            $this->servePlaceholderImage('cover');
        }
    }

    public function getCoverImage(int $userId): void
    {
        try {
            $user = $this->userModel->findById($userId);

            if (!$user) {
                $this->servePlaceholderImage('cover');
                return;
            }

            $possiblePaths = [];
            if (!empty($user['cover_url'])) {
                $possiblePaths[] = '/var/www/html/uploads/covers/' . basename($user['cover_url']);
                $possiblePaths[] = '/var/www/html/public/uploads/covers/' . basename($user['cover_url']);
            }

            $coverPath = null;
            foreach ($possiblePaths as $path) {
                if (file_exists($path) && is_readable($path)) {
                    $coverPath = $path;
                    break;
                }
            }

            if (!$coverPath) {
                $this->servePlaceholderImage('cover');
                return;
            }

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $coverPath);
            finfo_close($finfo);

            if (!str_starts_with($mimeType, 'image/')) {
                $mimeType = 'image/jpeg';
            }

            header('Content-Type: ' . $mimeType);
            header('Content-Length: ' . filesize($coverPath));
            header('Cache-Control: public, max-age=86400');
            header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 86400) . ' GMT');
            header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($coverPath)) . ' GMT');

            $etag = md5_file($coverPath);
            header('ETag: "' . $etag . '"');

            if (isset($_SERVER['HTTP_IF_NONE_MATCH']) &&
                trim($_SERVER['HTTP_IF_NONE_MATCH'], '"') === $etag) {
                http_response_code(304);
                exit;
            }

            readfile($coverPath);
            exit;

        } catch (\Exception $e) {
            error_log('UserController::getCoverImage - Error: ' . $e->getMessage());
            $this->servePlaceholderImage('cover');
        }
    }

    public function deleteAvatar(int $userId): void
    {
        $authenticated = $this->authMiddleware->handle();
        if (!$authenticated) {
            JsonResponse::unauthorized(['error' => 'Non authentifié']);
            return;
        }
        $authUser = $this->authMiddleware->getUser();
        $currentUserId = (int)($authUser['sub'] ?? $authUser['user_id'] ?? 0);
        if ($currentUserId !== $userId) {
            JsonResponse::forbidden(['error' => 'Non autorisé']);
            return;
        }

        $user = $this->db->fetchOne(
            "SELECT avatar_url FROM users WHERE id = $1",
            [$userId]
        );

        if (!$user) {
            JsonResponse::notFound(['error' => 'Utilisateur introuvable']);
            return;
        }

        if (!empty($user['avatar_url'])) {
            $filePath = __DIR__ . '/../../uploads/avatars/' . basename($user['avatar_url']);
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }

        $this->db->fetchOne(
            "UPDATE users SET avatar_url = NULL WHERE id = $1 RETURNING id",
            [$userId]
        );

        JsonResponse::success(['message' => 'Avatar supprimé', 'avatar_url' => null]);
    }

    public function deleteCover(int $userId): void
    {
        $authenticated = $this->authMiddleware->handle();
        if (!$authenticated) {
            JsonResponse::unauthorized(['error' => 'Non authentifié']);
            return;
        }
        $authUser = $this->authMiddleware->getUser();
        $currentUserId = (int)($authUser['sub'] ?? $authUser['user_id'] ?? 0);
        if ($currentUserId !== $userId) {
            JsonResponse::forbidden(['error' => 'Non autorisé']);
            return;
        }

        $user = $this->db->fetchOne(
            "SELECT cover_url FROM users WHERE id = $1",
            [$userId]
        );

        if (!$user) {
            JsonResponse::notFound(['error' => 'Utilisateur introuvable']);
            return;
        }

        if (!empty($user['cover_url'])) {
            $filePath = __DIR__ . '/../../uploads/covers/' . basename($user['cover_url']);
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }

        $this->db->fetchOne(
            "UPDATE users SET cover_url = NULL WHERE id = $1 RETURNING id",
            [$userId]
        );

        JsonResponse::success(['message' => 'Cover supprimée', 'cover_url' => null]);
    }

    public function getProfileImage(int $userId): void
    {
        try {
            $user = $this->userModel->findById($userId);

            if (!$user) {
                $this->servePlaceholderImage('profile');
                return;
            }

            $possiblePaths = [];
            if (!empty($user['avatar_url'])) {
                $possiblePaths[] = '/var/www/html/uploads/avatars/' . basename($user['avatar_url']);
                $possiblePaths[] = '/var/www/html/public/uploads/profiles/' . basename($user['avatar_url']);
            }

            $profilePath = null;
            foreach ($possiblePaths as $path) {
                if (file_exists($path) && is_readable($path)) {
                    $profilePath = $path;
                    break;
                }
            }

            if (!$profilePath) {
                $this->servePlaceholderImage('profile');
                return;
            }

            $finfo = finfo_open(FILEINFO_MIME_TYPE);
            $mimeType = finfo_file($finfo, $profilePath);
            finfo_close($finfo);

            if (!str_starts_with($mimeType, 'image/')) {
                $mimeType = 'image/jpeg';
            }

            header('Content-Type: ' . $mimeType);
            header('Content-Length: ' . filesize($profilePath));
            header('Cache-Control: public, max-age=86400');
            header('Expires: ' . gmdate('D, d M Y H:i:s', time() + 86400) . ' GMT');
            header('Last-Modified: ' . gmdate('D, d M Y H:i:s', filemtime($profilePath)) . ' GMT');

            $etag = md5_file($profilePath);
            header('ETag: "' . $etag . '"');

            if (isset($_SERVER['HTTP_IF_NONE_MATCH']) &&
                trim($_SERVER['HTTP_IF_NONE_MATCH'], '"') === $etag) {
                http_response_code(304);
                exit;
            }

            readfile($profilePath);
            exit;

        } catch (\Exception $e) {
            error_log('UserController::getProfileImage - Error: ' . $e->getMessage());
            $this->servePlaceholderImage('profile');
        }
    }

    private function servePlaceholderImage(string $type = 'profile'): void
    {
        $placeholders = [
            'profile' => '/var/www/html/public/images/default-avatar.svg',
            'cover'   => '/var/www/html/public/images/default-cover.svg',
        ];
        $placeholderPath = $placeholders[$type] ?? $placeholders['profile'];

        if (!file_exists($placeholderPath)) {
            header('Content-Type: image/png');
            $size = $type === 'cover' ? 800 : 200;
            $height = $type === 'cover' ? 300 : 200;
            $image = imagecreatetruecolor($size, $height);
            $gray = imagecolorallocate($image, 229, 231, 235);
            imagefill($image, 0, 0, $gray);
            imagepng($image);
            imagedestroy($image);
            exit;
        }

        header('Content-Type: image/svg+xml');
        header('Cache-Control: public, max-age=3600');
        header('Content-Length: ' . filesize($placeholderPath));
        readfile($placeholderPath);
        exit;
    }

    public function getSubscribersList(int $userId): void
    {
        try {
            if (!$this->db) {
                JsonResponse::serverError(['error' => 'Service non disponible']);
                return;
            }

            $rows = $this->db->fetchAll(
                "SELECT u.id, u.username, u.avatar_url, a.created_at AS subscribed_at
                 FROM abonnements a
                 JOIN users u ON u.id = a.subscriber_id
                 WHERE a.subscribed_to_id = $1 AND u.deleted_at IS NULL
                 ORDER BY a.created_at DESC",
                [$userId]
            );

            JsonResponse::success(['subscribers' => $rows ?? []]);
        } catch (\Exception $e) {
            error_log("UserController::getSubscribersList - Error: " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    private function hasUserImage(int $userId, string $type = 'avatar'): bool
    {
        $directory = $type === 'avatar' ? 'profiles' : 'covers';
        $basePath = __DIR__ . '/../../uploads/' . $directory . '/';

        $extensions = ['jpg', 'jpeg', 'png', 'webp'];

        foreach ($extensions as $ext) {
            if (file_exists($basePath . $userId . '.' . $ext)) {
                return true;
            }
        }

        return false;
    }
}