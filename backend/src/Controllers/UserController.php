<?php

namespace App\Controllers;

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

    public function __construct($userService, $uploadService, $userModel, $abonnementService, $authMiddleware)
    {
        $this->userService = $userService;
        $this->uploadService = $uploadService;
        $this->userModel = $userModel;
        $this->abonnementService = $abonnementService;
        $this->authMiddleware = $authMiddleware;
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

//    public function getProfileImage(int $userId)
//    {
//        try {
//            $user = $this->userModel->findById($userId);
//
//            if (!$user) {
//                JsonResponse::notFound(['error' => 'Utilisateur non trouvé']);
//                return;
//            }
//
//            if (empty($user['photo_profil'])) {
//                http_response_code(404);
//                header('Content-Type: image/svg+xml');
//                echo '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#ccc" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#666" font-size="40">?</text></svg>';
//                return;
//            }
//
//            $imagePath = __DIR__ . '/../../uploads/avatars/' . $user['photo_profil'];
//
//            if (!file_exists($imagePath)) {
//                http_response_code(404);
//                header('Content-Type: image/svg+xml');
//                echo '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#ccc" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#666" font-size="40">?</text></svg>';
//                return;
//            }
//
//            $mimeType = mime_content_type($imagePath);
//            header('Content-Type: ' . $mimeType);
//            header('Content-Length: ' . filesize($imagePath));
//            header('Cache-Control: public, max-age=31536000');
//            readfile($imagePath);
//
//        } catch (\Exception $e) {
//            error_log('Get profile image error: ' . $e->getMessage());
//            http_response_code(500);
//        }
//    }

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

//    public function getSubscribersCount(int $userId)
//    {
//        try {
//            $count = $this->userModel->getSubscribersCount($userId);
//
//            JsonResponse::success([
//                'user_id' => $userId,
//                'subscribers_count' => $count
//            ]);
//
//        } catch (\Exception $e) {
//            error_log('Get subscribers count error: ' . $e->getMessage());
//            JsonResponse::serverError(['error' => 'Erreur lors de la récupération du nombre d\'abonnés']);
//        }
//    }

    public function getSubscribeStatus(int $targetUserId, $currentUserId = null)
    {
        try {
            if ($currentUserId === null) {
                JsonResponse::success([
                    'is_subscribed' => false,
                    'user_id' => $targetUserId
                ]);
                return;
            }

            $isSubscribed = $this->userModel->isSubscribed($currentUserId, $targetUserId);

            JsonResponse::success([
                'is_subscribed' => $isSubscribed,
                'user_id' => $targetUserId,
                'subscriber_id' => $currentUserId
            ]);

        } catch (\Exception $e) {
            error_log('Get subscribe status error: ' . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur lors de la vérification du statut d\'abonnement']);
        }
    }

    public function subscribe(int $targetUserId, $subscriberId)
    {
        try {
            if ($targetUserId === $subscriberId) {
                JsonResponse::badRequest(['error' => 'Vous ne pouvez pas vous abonner à vous-même']);
                return;
            }

            $targetUser = $this->userModel->findById($targetUserId);
            if (!$targetUser) {
                JsonResponse::notFound(['error' => 'Utilisateur cible non trouvé']);
                return;
            }

            $isAlreadySubscribed = $this->userModel->isSubscribed($subscriberId, $targetUserId);

            if ($isAlreadySubscribed) {
                JsonResponse::badRequest(['error' => 'Vous êtes déjà abonné à cet utilisateur']);
                return;
            }

            $result = $this->userModel->subscribe($subscriberId, $targetUserId);

            if (!$result) {
                JsonResponse::serverError(['error' => 'Erreur lors de l\'abonnement']);
                return;
            }

            $newCount = $this->userModel->getSubscribersCount($targetUserId);

            JsonResponse::success([
                'message' => 'Abonnement réussi',
                'is_subscribed' => true,
                'subscribers_count' => $newCount
            ], 201);

        } catch (\Exception $e) {
            error_log('Subscribe error: ' . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur lors de l\'abonnement']);
        }
    }

    public function unsubscribe(int $targetUserId, $subscriberId)
    {
        try {
            $isSubscribed = $this->userModel->isSubscribed($subscriberId, $targetUserId);

            if (!$isSubscribed) {
                JsonResponse::badRequest(['error' => 'Vous n\'êtes pas abonné à cet utilisateur']);
                return;
            }

            $result = $this->userModel->unsubscribe($subscriberId, $targetUserId);

            if (!$result) {
                JsonResponse::serverError(['error' => 'Erreur lors du désabonnement']);
                return;
            }

            $newCount = $this->userModel->getSubscribersCount($targetUserId);

            JsonResponse::success([
                'message' => 'Désabonnement réussi',
                'is_subscribed' => false,
                'subscribers_count' => $newCount
            ]);

        } catch (\Exception $e) {
            error_log('Unsubscribe error: ' . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur lors du désabonnement']);
        }
    }

    public function changePassword()
    {
        try {
            $user = AuthAide::requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['current_password']) || !isset($data['new_password'])) {
                JsonResponse::badRequest(['error' => 'Mot de passe actuel et nouveau mot de passe requis']);
                return;
            }

            $userRecord = $this->userModel->findById($user['sub']);

            if (!$userRecord || !password_verify($data['current_password'], $userRecord['mot_de_passe'])) {
                JsonResponse::unauthorized(['error' => 'Mot de passe actuel incorrect']);
                return;
            }

            if (strlen($data['new_password']) < 8) {
                JsonResponse::badRequest(['error' => 'Le nouveau mot de passe doit contenir au moins 8 caractères']);
                return;
            }

            $hashedPassword = password_hash($data['new_password'], PASSWORD_BCRYPT);
            $result = $this->userModel->updatePassword($user['sub'], $hashedPassword);

            if (!$result) {
                JsonResponse::serverError(['error' => 'Erreur lors du changement de mot de passe']);
                return;
            }

            JsonResponse::success([
                'message' => 'Mot de passe changé avec succès'
            ]);

        } catch (\Exception $e) {
            error_log('Change password error: ' . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur lors du changement de mot de passe']);
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

            $basePath = '/var/www/html/public/uploads/covers/';
            $possiblePaths = [
                $basePath . $userId . '.jpg',
                $basePath . $userId . '.jpeg',
                $basePath . $userId . '.png',
                $basePath . $userId . '.webp',
            ];

            if (!empty($user['cover_url'])) {
                $coverFilename = basename($user['cover_url']);
                $customPath = $basePath . $coverFilename;

                if (file_exists($customPath) && is_readable($customPath)) {
                    array_unshift($possiblePaths, $customPath);
                }
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

    public function getProfileImage(int $userId): void
    {
        try {
            $user = $this->userModel->findById($userId);

            if (!$user) {
                $this->servePlaceholderImage('profile');
                return;
            }

            $basePath = '/var/www/html/public/uploads/profiles/';
            $possiblePaths = [
                $basePath . $userId . '.jpg',
                $basePath . $userId . '.jpeg',
                $basePath . $userId . '.png',
                $basePath . $userId . '.webp',
            ];

            if (!empty($user['avatar_url'])) {
                $avatarFilename = basename($user['avatar_url']);
                $customPath = $basePath . $avatarFilename;

                if (file_exists($customPath) && is_readable($customPath)) {
                    array_unshift($possiblePaths, $customPath);
                }
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
            'profile' => '/var/www/html/public/images/default-avatar.png',
            'cover' => '/var/www/html/public/images/default-cover.png',
        ];

        $placeholderPath = $placeholders[$type] ?? $placeholders['profile'];

        if (!file_exists($placeholderPath)) {
            header('Content-Type: image/png');
            header('Cache-Control: public, max-age=3600');

            $size = $type === 'cover' ? 800 : 200;
            $height = $type === 'cover' ? 300 : 200;

            $image = imagecreatetruecolor($size, $height);

            if ($type === 'cover') {
                $blue = imagecolorallocate($image, 59, 130, 246);
                imagefill($image, 0, 0, $blue);
            } else {
                $gray = imagecolorallocate($image, 229, 231, 235);
                imagefill($image, 0, 0, $gray);

                $iconColor = imagecolorallocate($image, 156, 163, 175);
                imagefilledellipse($image, $size / 2, $size / 3, $size / 3, $size / 3, $iconColor);
            }

            imagepng($image);
            imagedestroy($image);
            exit;
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $placeholderPath);
        finfo_close($finfo);

        header('Content-Type: ' . $mimeType);
        header('Content-Length: ' . filesize($placeholderPath));
        header('Cache-Control: public, max-age=3600');

        readfile($placeholderPath);
        exit;
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