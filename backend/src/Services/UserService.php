<?php
namespace App\Services;

use App\Interfaces\DatabaseInterface;
use App\Models\User;
use App\Models\Video;
use App\Models\VideoView;
use App\Utils\SecurityHelper;

class UserService
{
    public function __construct(
        private User $userModel,
        private Video $videoModel,
        private VideoView $videoViewModel,
        private DatabaseInterface $db,
        private ValidationService $validationService,
        private AuditService $auditService,
        private ?NotificationCreationService $notificationCreator = null,
        private ?UploadService $uploadService = null
    ) {}

    public function getProfile(int $userId): array
    {
        try {
            $user = $this->userModel->findById($userId);

            if (!$user) {
                return [
                    'success' => false,
                    'message' => 'Utilisateur introuvable',
                    'code' => 404
                ];
            }

            return [
                'success' => true,
                'data' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'email' => $user['email'],
                    'avatar_url' => $user['avatar_url'] ?? '/uploads/avatars/default.png',
                    'cover_url' => $user['cover_url'] ?? '/uploads/covers/default.png',
                    'bio' => $user['bio'] ?? null,
                    'created_at' => $user['created_at'],
                    'email_verified' => $user['email_verified'] ?? false,
                    'two_fa_enabled' => $user['two_fa_enabled'] ?? false
                ]
            ];

        } catch (\Exception $e) {
            error_log("UserService::getProfile - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la récupération du profil',
                'code' => 500
            ];
        }
    }

    public function getUserProfile(int $userId): array
    {
        try {
            $user = $this->userModel->findById($userId);

            if (!$user) {
                return [
                    'success' => false,
                    'message' => 'Utilisateur non trouvé',
                    'code' => 404
                ];
            }

            unset($user['password_hash']);
            unset($user['two_fa_secret']);
            unset($user['verification_token']);

            return [
                'success' => true,
                'profile' => $user
            ];
        } catch (\Exception $e) {
            error_log("UserService::getUserProfile - Error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Erreur serveur',
                'code' => 500
            ];
        }
    }

    public function getStats(int $userId): array
    {
        try {
            $user = $this->userModel->findById($userId);

            if (!$user) {
                return [
                    'success' => false,
                    'message' => 'Utilisateur introuvable',
                    'code' => 404
                ];
            }

            $stats = $this->userModel->getStats($userId);

            return [
                'success' => true,
                'user' => [
                    'username' => $user['username'],
                    'email' => $user['email'],
                    'created_at' => $user['created_at']
                ],
                'stats' => $stats
            ];

        } catch (\Exception $e) {
            error_log("UserService::getStats - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques',
                'code' => 500
            ];
        }
    }

    public function updateProfile(int $userId, string $username, string $email, ?string $bio = null): array
    {
        try {
            $username = SecurityHelper::sanitizeInput(trim($username));
            $email = SecurityHelper::sanitizeInput(trim($email));
            $bio = $bio ? SecurityHelper::sanitizeInput(trim($bio)) : null;

            $usernameErrors = $this->validationService->validateUsername($username);
            if (!empty($usernameErrors)) {
                return [
                    'success' => false,
                    'code' => 400,
                    'errors' => $usernameErrors
                ];
            }

            $emailErrors = $this->validationService->validateEmail($email);
            if (!empty($emailErrors)) {
                return [
                    'success' => false,
                    'code' => 400,
                    'errors' => $emailErrors
                ];
            }

            if ($bio && strlen($bio) > 500) {
                return [
                    'success' => false,
                    'code' => 400,
                    'message' => 'La bio ne peut pas dépasser 500 caractères'
                ];
            }

            if ($this->userModel->emailExists($email, $userId)) {
                return [
                    'success' => false,
                    'code' => 409,
                    'message' => 'Cet email est déjà utilisé'
                ];
            }

            if ($this->userModel->usernameExists($username, $userId)) {
                return [
                    'success' => false,
                    'code' => 409,
                    'message' => 'Ce nom d\'utilisateur est déjà utilisé'
                ];
            }

            $this->userModel->updateProfile($userId, $username, $email, $bio);

            $this->auditService->logSecurityEvent(
                $userId,
                'profile_updated',
                ['username' => $username, 'email' => $email]
            );

            return [
                'success' => true,
                'message' => 'Profil mis à jour avec succès',
                'user' => [
                    'username' => $username,
                    'email' => $email,
                    'bio' => $bio
                ]
            ];

        } catch (\Exception $e) {
            error_log("UserService::updateProfile - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la mise à jour',
                'code' => 500
            ];
        }
    }

    public function uploadAvatar(int $userId, array $file): array
    {
        try {
            if (!$this->uploadService) {
                return [
                    'success' => false,
                    'message' => 'Service d\'upload non disponible',
                    'code' => 500
                ];
            }

            $result = $this->uploadService->uploadImage($file, $userId, 'profile');

            if (!$result['success']) {
                return $result;
            }

            $sql = "UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2";
            $this->db->execute($sql, [$result['path'], $userId]);

            $user = $this->userModel->findById($userId);
            if ($user && !empty($user['avatar_url']) && $user['avatar_url'] !== '/uploads/avatars/default.png') {
                $oldFilename = basename($user['avatar_url']);
                $this->uploadService->deleteFile($oldFilename, 'profile');
            }

            $this->auditService->logSecurityEvent(
                $userId,
                'avatar_uploaded',
                ['filename' => $result['filename']]
            );

            return [
                'success' => true,
                'message' => 'Avatar uploadé avec succès',
                'path' => $result['path'],
                'filename' => $result['filename']
            ];

        } catch (\Exception $e) {
            error_log("UserService::uploadAvatar - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de l\'upload',
                'code' => 500
            ];
        }
    }

    public function uploadCover(int $userId, array $file): array
    {
        try {
            if (!$this->uploadService) {
                return [
                    'success' => false,
                    'message' => 'Service d\'upload non disponible',
                    'code' => 500
                ];
            }

            $result = $this->uploadService->uploadImage($file, $userId, 'cover');

            if (!$result['success']) {
                return $result;
            }

            $sql = "UPDATE users SET cover_url = $1, updated_at = NOW() WHERE id = $2";
            $this->db->execute($sql, [$result['path'], $userId]);

            $user = $this->userModel->findById($userId);
            if ($user && !empty($user['cover_url']) && $user['cover_url'] !== '/uploads/covers/default.png') {
                $oldFilename = basename($user['cover_url']);
                $this->uploadService->deleteFile($oldFilename, 'cover');
            }

            $this->auditService->logSecurityEvent(
                $userId,
                'cover_uploaded',
                ['filename' => $result['filename']]
            );

            return [
                'success' => true,
                'message' => 'Cover uploadée avec succès',
                'path' => $result['path'],
                'filename' => $result['filename']
            ];

        } catch (\Exception $e) {
            error_log("UserService::uploadCover - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de l\'upload',
                'code' => 500
            ];
        }
    }

    public function getSubscribersCount(int $userId): array
    {
        try {
            $result = $this->db->fetchOne(
                "SELECT COUNT(*) as count FROM subscriptions WHERE creator_id = $1",
                [$userId]
            );

            return [
                'success' => true,
                'count' => (int)($result['count'] ?? 0)
            ];

        } catch (\Exception $e) {
            error_log("UserService::getSubscribersCount - Error: " . $e->getMessage());

            return [
                'success' => false,
                'count' => 0,
                'message' => 'Erreur lors de la récupération'
            ];
        }
    }

    public function getSubscribeStatus(int $creatorId, int $userId): array
    {
        try {
            $result = $this->db->fetchOne(
                "SELECT COUNT(*) as count 
                 FROM subscriptions 
                 WHERE creator_id = $1 AND subscriber_id = $2",
                [$creatorId, $userId]
            );

            return [
                'success' => true,
                'isSubscribed' => (int)($result['count'] ?? 0) > 0,
                'subscribed' => (int)($result['count'] ?? 0) > 0  // Alias
            ];

        } catch (\Exception $e) {
            error_log("UserService::getSubscribeStatus - Error: " . $e->getMessage());

            return [
                'success' => false,
                'isSubscribed' => false,
                'subscribed' => false
            ];
        }
    }

    public function subscribe(int $creatorId, int $subscriberId): array
    {
        try {
            if ($creatorId === $subscriberId) {
                return [
                    'success' => false,
                    'message' => 'Vous ne pouvez pas vous abonner à vous-même',
                    'code' => 400
                ];
            }

            // Vérifier que le créateur existe
            if (!$this->userModel->findById($creatorId)) {
                return [
                    'success' => false,
                    'message' => 'Créateur introuvable',
                    'code' => 404
                ];
            }

            $sql = "INSERT INTO subscriptions (creator_id, subscriber_id, subscribed_at)
                    VALUES ($1, $2, NOW())
                    ON CONFLICT (creator_id, subscriber_id) DO NOTHING";

            $this->db->execute($sql, [$creatorId, $subscriberId]);

            if ($this->notificationCreator) {
                try {
                    $subscriber = $this->userModel->findById($subscriberId);
                    $subscriberName = $subscriber['username'] ?? 'Utilisateur';

                    $this->notificationCreator->notifySubscribe(
                        $creatorId,
                        $subscriberId,
                        $subscriberName
                    );
                } catch (\Exception $e) {
                    error_log("UserService::subscribe - Notification error: " . $e->getMessage());
                }
            }

            return [
                'success' => true,
                'message' => 'Abonnement réussi'
            ];

        } catch (\Exception $e) {
            error_log("UserService::subscribe - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de l\'abonnement',
                'code' => 500
            ];
        }
    }

    public function unsubscribe(int $creatorId, int $subscriberId): array
    {
        try {
            $sql = "DELETE FROM subscriptions 
                    WHERE creator_id = $1 AND subscriber_id = $2";

            $this->db->execute($sql, [$creatorId, $subscriberId]);

            return [
                'success' => true,
                'message' => 'Désabonnement réussi'
            ];

        } catch (\Exception $e) {
            error_log("UserService::unsubscribe - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors du désabonnement',
                'code' => 500
            ];
        }
    }

    public function getWatchHistory(int $userId, int $limit = 20, int $offset = 0): array
    {
        try {
            $limit = min(max(1, $limit), 100);
            $offset = max(0, $offset);

            $history = $this->videoViewModel->getUserWatchHistory($userId, $limit, $offset);
            $total = count($history);

            return [
                'success' => true,
                'history' => $history,
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset,
                'hasMore' => ($offset + $limit) < $total
            ];

        } catch (\Exception $e) {
            error_log("UserService::getWatchHistory - Error: " . $e->getMessage());

            return [
                'success' => false,
                'history' => [],
                'total' => 0
            ];
        }
    }

    /**
     * ✅ BONUS - Obtenir la liste des abonnés
     */
    public function getSubscribers(int $creatorId, int $limit = 20, int $offset = 0): array
    {
        try {
            $limit = min(max(1, $limit), 100);
            $offset = max(0, $offset);

            $sql = "SELECT u.id, u.username, u.avatar_url, s.subscribed_at
                    FROM subscriptions s
                    JOIN users u ON s.subscriber_id = u.id
                    WHERE s.creator_id = $1
                    ORDER BY s.subscribed_at DESC
                    LIMIT $2 OFFSET $3";

            $subscribers = $this->db->fetchAll($sql, [$creatorId, $limit, $offset]);

            // Compter le total
            $countResult = $this->db->fetchOne(
                "SELECT COUNT(*) as count FROM subscriptions WHERE creator_id = $1",
                [$creatorId]
            );

            $total = (int)($countResult['count'] ?? 0);

            return [
                'success' => true,
                'subscribers' => $subscribers,
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset
            ];

        } catch (\Exception $e) {
            error_log("UserService::getSubscribers - Error: " . $e->getMessage());

            return [
                'success' => false,
                'subscribers' => [],
                'total' => 0
            ];
        }
    }

    /**
     * ✅ BONUS - Obtenir la liste des abonnements
     */
    public function getSubscriptions(int $subscriberId, int $limit = 20, int $offset = 0): array
    {
        try {
            $limit = min(max(1, $limit), 100);
            $offset = max(0, $offset);

            $sql = "SELECT u.id, u.username, u.avatar_url, s.subscribed_at
                    FROM subscriptions s
                    JOIN users u ON s.creator_id = u.id
                    WHERE s.subscriber_id = $1
                    ORDER BY s.subscribed_at DESC
                    LIMIT $2 OFFSET $3";

            $subscriptions = $this->db->fetchAll($sql, [$subscriberId, $limit, $offset]);

            // Compter le total
            $countResult = $this->db->fetchOne(
                "SELECT COUNT(*) as count FROM subscriptions WHERE subscriber_id = $1",
                [$subscriberId]
            );

            $total = (int)($countResult['count'] ?? 0);

            return [
                'success' => true,
                'subscriptions' => $subscriptions,
                'total' => $total,
                'limit' => $limit,
                'offset' => $offset
            ];

        } catch (\Exception $e) {
            error_log("UserService::getSubscriptions - Error: " . $e->getMessage());

            return [
                'success' => false,
                'subscriptions' => [],
                'total' => 0
            ];
        }
    }

    /**
     * ✅ BONUS - Mettre à jour la bio uniquement
     */
    public function updateBio(int $userId, string $bio): array
    {
        try {
            $bio = SecurityHelper::sanitizeInput(trim($bio));

            if (strlen($bio) > 500) {
                return [
                    'success' => false,
                    'message' => 'La bio ne peut pas dépasser 500 caractères',
                    'code' => 400
                ];
            }

            $sql = "UPDATE users SET bio = $1, updated_at = NOW() WHERE id = $2";
            $this->db->execute($sql, [$bio, $userId]);

            return [
                'success' => true,
                'message' => 'Bio mise à jour',
                'bio' => $bio
            ];

        } catch (\Exception $e) {
            error_log("UserService::updateBio - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la mise à jour',
                'code' => 500
            ];
        }
    }

    public function searchUsers(string $query, int $limit = 20, int $offset = 0): array
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

            $sql = "SELECT id, username, avatar_url, bio, created_at
                    FROM users
                    WHERE username ILIKE $1 OR email ILIKE $1
                    ORDER BY username
                    LIMIT $2 OFFSET $3";

            $users = $this->db->fetchAll($sql, [$searchPattern, $limit, $offset]);

            return [
                'success' => true,
                'users' => $users,
                'count' => count($users),
                'query' => $query
            ];

        } catch (\Exception $e) {
            error_log("UserService::searchUsers - Error: " . $e->getMessage());

            return [
                'success' => false,
                'users' => [],
                'count' => 0
            ];
        }
    }
}