<?php

namespace App\Controllers;

use App\Middleware\AuthAide;
use App\Utils\JsonResponse;
use App\Services\abonnementService;

class UserController
{
    private $userService;
    private $uploadService;
    private $userModel;
    private $abonnementService;
    private $authMiddleware;

    public function __construct($userService, $uploadService, $userModel, $abonnementService, $authMiddleware)
    {
        $this->userService = $userService;
        $this->uploadService = $uploadService;
        $this->userModel = $userModel;
        $this->abonnementService = $abonnementService;
        $this->authMiddleware = $authMiddleware;
    }

    public function uploadAvatar()
    {
        try {
            $currentUser = $this->authMiddleware->handle();

            if (!$currentUser) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
                return;
            }

            if (!isset($_FILES['avatar']) && !isset($_FILES['photo_profil']) && !isset($_FILES['profile-image'])) {
                JsonResponse::badRequest(['error' => 'Aucun fichier fourni']);
                return;
            }

            $file = $_FILES['avatar'] ?? $_FILES['photo_profil'] ?? $_FILES['profile-image'];

            $userId = $currentUser['user_id'] ?? $currentUser['sub'] ?? null;

            if (!$userId) {
                JsonResponse::unauthorized(['error' => 'ID utilisateur invalide']);
                return;
            }

            $uploadResult = $this->uploadService->uploadImage($file, $userId, 'avatar');

            if (!$uploadResult['success']) {
                JsonResponse::serverError(['error' => $uploadResult['message'] ?? 'Erreur upload']);
                return;
            }

            $updateResult = $this->userModel->updateAvatar($userId, $uploadResult['filename']);

            if (!$updateResult) {
                JsonResponse::serverError(['error' => 'Erreur mise à jour profil']);
                return;
            }

            JsonResponse::success([
                'message' => 'Avatar mis à jour',
                'avatar_url' => '/' . $uploadResult['path'],
                'filename' => $uploadResult['filename']
            ]);

        } catch (\Exception $e) {
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

    public function uploadCover()
    {
        try {
            $currentUser = $this->authMiddleware->handle();

            if (!$currentUser) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
                return;
            }

            if (!isset($_FILES['cover']) && !isset($_FILES['photo_couverture'])) {
                JsonResponse::badRequest(['error' => 'Aucun fichier fourni']);
                return;
            }

            $file = $_FILES['cover'] ?? $_FILES['photo_couverture'];

            $userId = $currentUser['user_id'] ?? $currentUser['sub'] ?? null;

            if (!$userId) {
                JsonResponse::unauthorized(['error' => 'ID utilisateur invalide']);
                return;
            }

            $uploadResult = $this->uploadService->uploadImage($file, $userId, 'cover');

            if (!$uploadResult['success']) {
                JsonResponse::serverError(['error' => $uploadResult['message'] ?? 'Erreur upload']);
                return;
            }

            $updateResult = $this->userModel->updateCover($userId, $uploadResult['filename']);

            if (!$updateResult) {
                JsonResponse::serverError(['error' => 'Erreur mise à jour couverture']);
                return;
            }

            JsonResponse::success([
                'message' => 'Couverture mise à jour',
                'cover_url' => '/' . $uploadResult['path'],
                'filename' => $uploadResult['filename']
            ]);

        } catch (\Exception $e) {
            error_log('Upload cover error: ' . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur upload couverture']);
        }
    }

    public function updateProfile()
    {
        try {
            $user = AuthAide::requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);

            if (!$data) {
                JsonResponse::badRequest(['error' => 'Données invalides']);
                return;
            }

            $allowedFields = ['username', 'email', 'bio', 'nom', 'prenom'];
            $updateData = [];

            foreach ($allowedFields as $field) {
                if (isset($data[$field])) {
                    $updateData[$field] = $data[$field];
                }
            }

            if (empty($updateData)) {
                JsonResponse::badRequest(['error' => 'Aucune donnée à mettre à jour']);
                return;
            }

            if (isset($updateData['username'])) {
                if (strlen($updateData['username']) < 3 || strlen($updateData['username']) > 30) {
                    JsonResponse::badRequest(['error' => 'Le nom d\'utilisateur doit contenir entre 3 et 30 caractères']);
                    return;
                }
            }

            if (isset($updateData['email'])) {
                if (!filter_var($updateData['email'], FILTER_VALIDATE_EMAIL)) {
                    JsonResponse::badRequest(['error' => 'Email invalide']);
                    return;
                }
            }

            if (isset($updateData['bio'])) {
                if (strlen($updateData['bio']) > 500) {
                    JsonResponse::badRequest(['error' => 'La bio ne peut pas dépasser 500 caractères']);
                    return;
                }
            }

            $result = $this->userModel->updateProfile($user['sub'], $updateData);

            if (!$result) {
                JsonResponse::serverError(['error' => 'Erreur lors de la mise à jour du profil']);
                return;
            }

            $updatedUser = $this->userModel->findById($user['sub']);

            JsonResponse::success([
                'message' => 'Profil mis à jour avec succès',
                'user' => [
                    'id' => $updatedUser['id'],
                    'username' => $updatedUser['username'],
                    'email' => $updatedUser['email'],
                    'bio' => $updatedUser['bio'] ?? null,
                    'photo_profil' => $updatedUser['photo_profil'] ?? null
                ]
            ]);

        } catch (\Exception $e) {
            error_log('Update profile error: ' . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur lors de la mise à jour du profil']);
        }
    }

    public function updateBio()
    {
        try {
            $user = AuthAide::requireAuth();
            $data = json_decode(file_get_contents('php://input'), true);

            if (!isset($data['bio'])) {
                JsonResponse::badRequest(['error' => 'Bio manquante']);
                return;
            }

            $bio = trim($data['bio']);

            if (strlen($bio) > 500) {
                JsonResponse::badRequest(['error' => 'La bio ne peut pas dépasser 500 caractères']);
                return;
            }

            $result = $this->userModel->updateBio($user['sub'], $bio);

            if (!$result) {
                JsonResponse::serverError(['error' => 'Erreur lors de la mise à jour de la bio']);
                return;
            }

            JsonResponse::success([
                'message' => 'Bio mise à jour avec succès',
                'bio' => $bio
            ]);

        } catch (\Exception $e) {
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

    public function getProfileImage(int $userId)
    {
        try {
            $user = $this->userModel->findById($userId);

            if (!$user) {
                JsonResponse::notFound(['error' => 'Utilisateur non trouvé']);
                return;
            }

            if (empty($user['photo_profil'])) {
                http_response_code(404);
                header('Content-Type: image/svg+xml');
                echo '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#ccc" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#666" font-size="40">?</text></svg>';
                return;
            }

            $imagePath = __DIR__ . '/../../uploads/avatars/' . $user['photo_profil'];

            if (!file_exists($imagePath)) {
                http_response_code(404);
                header('Content-Type: image/svg+xml');
                echo '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#ccc" width="100" height="100"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#666" font-size="40">?</text></svg>';
                return;
            }

            $mimeType = mime_content_type($imagePath);
            header('Content-Type: ' . $mimeType);
            header('Content-Length: ' . filesize($imagePath));
            header('Cache-Control: public, max-age=31536000');
            readfile($imagePath);

        } catch (\Exception $e) {
            error_log('Get profile image error: ' . $e->getMessage());
            http_response_code(500);
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
}