<?php

namespace App\Services;

use App\Repositories\LogRepository;
use App\Repositories\SessionRepository;
use App\Repositories\UserRepository;
use PDOException;

class AuthService
{

    public function __construct(
        private UserRepository $userModel,
        private UserRepository $userRepository,
        private TokenService $tokenService,
        private ValidationService $validationService,
        private SessionRepository $sessionRepository,
        private EmailService $emailService,
        private AuditService $auditService
    ) {}

    public function login(string $email, string $password): array
    {
        $validationErrors = $this->validationService->validateLoginData($email, $password);
        if (!empty($validationErrors)) {
            return [
                'success' => false,
                'code' => 400,
                'errors' => $validationErrors
            ];
        }

        $user = $this->userModel->findByEmail($email);

        if ($user && !empty($user['account_locked_until']) && strtotime($user['account_locked_until']) > time()) {
            $this->auditService->logSuspiciousActivity(
                (int)$user['id'],
                'Tentative de connexion sur compte verrouillé',
                ['email' => $email, 'locked_until' => $user['account_locked_until']]
            );

            return [
                'success' => false,
                'code' => 423,
                'message' => 'Compte temporairement verrouillé. Réessayez plus tard.'
            ];
        }

        if (!$user || !password_verify($password, $user['password_hash'])) {
            $this->auditService->logLoginFailed($email);

            if ($user) {
                $currentAttempts = (int)($user['failed_login_attempts'] ?? 0);
                $nextAttempts = $currentAttempts + 1;
                $this->userModel->incrementFailedLogins((int)$user['id']);

                if ($nextAttempts >= 5) {
                    $this->userModel->lockAccount((int)$user['id'], 15);
                    $this->auditService->logSuspiciousActivity(
                        (int)$user['id'],
                        'Compte verrouillé après trop de tentatives de connexion',
                        ['attempts' => $nextAttempts]
                    );
                }
            }

            return [
                'success' => false,
                'code' => 401,
                'message' => 'Email ou mot de passe incorrect'
            ];
        }

        if (isset($user['deleted_at']) && $user['deleted_at'] !== null) {
            $this->auditService->logSuspiciousActivity((int)$user['id'], 'Connexion refusée: compte désactivé', ['email' => $email]);

            return [
                'success' => false,
                'code' => 403,
                'message' => 'Ce compte a été désactivé'
            ];
        }
        if (!empty($user['two_fa_enabled'])) {
            return [
                'success' => true,
                'requires_2fa' => true,
                'user_id' => (int)$user['id'],
            ];
        }

        $accessToken = $this->tokenService->generateToken($user);
        $refreshToken = $this->tokenService->generateRefreshToken($user);

        try {
            $sessionData = [
                'user_id' => (int)$user['id'],
                'token' => $refreshToken,
                'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                'expires_at' => date('Y-m-d H:i:s', time() + 60 * 60 * 24 * 30)
            ];
            $this->sessionRepository->createSession($sessionData);
        } catch (\Exception $e) {
            error_log("AuthService::login - Session creation error: " . $e->getMessage());
        }

        $this->auditService->logLoginSuccess((int)$user['id']);
        $this->userModel->updateLastLogin((int)$user['id']);

        return [
            'success' => true,
            'userId' => $user['id'],
            'data' => [
                'access_token' => $accessToken,
                'refresh_token' => $refreshToken,
                'token_type' => 'Bearer',
                'expires_in' => 3600,
                'user' => [
                    'id' => $user['id'],
                    'username' => $user['username'],
                    'email' => $user['email'],
                    'role' => $user['role'] ?? 'user',
                    'avatar_url' => $user['avatar_url'] ?? null,
                    'email_verified' => $user['email_verified'] ?? false,
                    'two_fa_enabled' => $user['two_fa_enabled'] ?? false
                ]
            ]
        ];
    }

    public function register(string $username, string $email, string $password): array
    {
        $validationErrors = $this->validationService->validateRegistrationData($username, $email, $password);
        if (!empty($validationErrors)) {
            return [
                'success' => false,
                'code' => 400,
                'errors' => $validationErrors
            ];
        }

        try {
            if ($this->userModel->existsByEmailOrUsername($email, $username)) {
                return [
                    'success' => false,
                    'code' => 409,
                    'message' => 'Un utilisateur avec cet email ou ce nom existe déjà'
                ];
            }

            $userData = [
                'username' => $username,
                'email' => $email,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'email_verified' => false,
                'verification_token' => bin2hex(random_bytes(32)),
                'verification_token_expires' => date('Y-m-d H:i:s', time() + 3600),
                'ip_registration' => $_SERVER['REMOTE_ADDR'] ?? null,
                'user_agent_registration' => $_SERVER['HTTP_USER_AGENT'] ?? null,
            ];

            $userId = $this->userModel->createUser($userData);

            if (!$userId) {
                return [
                    'success' => false,
                    'code' => 500,
                    'message' => 'Erreur lors de la création du compte'
                ];
            }

            $user = $this->userModel->findById($userId) ?: [
                'id' => $userId,
                'username' => $username,
                'email' => $email,
                'role' => 'membre',
                'avatar_url' => null,
                'email_verified' => false
            ];

            $verificationToken = $userData['verification_token'];
            $this->userModel->saveEmailVerificationToken($userId, $verificationToken);
            $this->emailService->sendVerificationEmail($userId, $email, $username, $verificationToken);
            $accessToken = $this->tokenService->generateToken($user);
            $refreshToken = $this->tokenService->generateRefreshToken($user);

            try {
                $sessionData = [
                    'user_id' => $userId,
                    'token' => $refreshToken,
                    'ip_address' => $_SERVER['REMOTE_ADDR'] ?? null,
                    'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
                    'expires_at' => date('Y-m-d H:i:s', time() + 60 * 60 * 24 * 30)
                ];

                $this->sessionRepository->createSession($sessionData);
            } catch (\Exception $e) {
                error_log("AuthService::register - Session creation error: " . $e->getMessage());
            }

            $this->auditService->logUserRegistered($userId, $email);

            return [
                'success' => true,
                'userId' => $userId,
                'data' => [
                    'message' => 'Utilisateur créé avec succès',
                    'access_token' => $accessToken,
                    'refresh_token' => $refreshToken,
                    'token_type' => 'Bearer',
                    'expires_in' => 3600,
                    'user' => [
                        'id' => $user['id'],
                        'username' => $user['username'],
                        'email' => $user['email'],
                        'role' => $user['role'] ?? 'user',
                        'avatar_url' => $user['avatar_url'] ?? null,
                        'email_verified' => false
                    ]
                ]
            ];

        } catch (\Exception $e) {
            error_log('AuthService::register - Error: ' . $e->getMessage());

            return [
                'success' => false,
                'code' => 500,
                'message' => 'Erreur lors de la création du compte'
            ];
        }
    }

    public function refresh(string $refreshToken): array
    {
        $payload = $this->tokenService->validateToken($refreshToken);

        if (!$payload || !isset($payload['type']) || $payload['type'] !== 'refresh') {
            return [
                'success' => false,
                'code' => 401,
                'message' => 'Refresh token invalide'
            ];
        }

        try {
            $session = $this->sessionRepository->findByToken($refreshToken);

            if (!$session || !$session['is_active']) {
                return [
                    'success' => false,
                    'code' => 401,
                    'message' => 'Session invalide ou expirée'
                ];
            }
        } catch (\Exception $e) {
            error_log("AuthService::refresh - Session check error: " . $e->getMessage());
        }

        $user = $this->userModel->findById($payload['sub']);

        if (!$user) {
            return [
                'success' => false,
                'code' => 404,
                'message' => 'Utilisateur introuvable'
            ];
        }

        if (isset($user['deleted_at']) && $user['deleted_at'] !== null) {
            return [
                'success' => false,
                'code' => 403,
                'message' => 'Compte désactivé'
            ];
        }

        $newAccessToken = $this->tokenService->generateToken($user);

        return [
            'success' => true,
            'data' => [
                'access_token' => $newAccessToken,
                'token_type' => 'Bearer',
                'expires_in' => 3600
            ]
        ];
    }

    public function getCurrentUser(int $userId): array
    {
        $user = $this->userModel->findById($userId);

        if (!$user) {
            return [
                'success' => false,
                'code' => 404,
                'message' => 'Utilisateur introuvable'
            ];
        }

        return [
            'success' => true,
            'data' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'role' => $user['role'] ?? 'user',
                'avatar_url' => $user['avatar_url'] ?? null,
                'cover_url' => $user['cover_url'] ?? null,
                'bio' => $user['bio'] ?? null,
                'email_verified' => $user['email_verified'] ?? false,
                'two_fa_enabled' => $user['two_fa_enabled'] ?? false,
                'created_at' => $user['created_at']
            ]
        ];
    }

    public function changePassword(int $userId, string $currentPassword, string $newPassword): array
    {
        $errors = $this->validationService->validatePassword($newPassword);
        if (!empty($errors)) {
            return [
                'success' => false,
                'code' => 400,
                'errors' => $errors
            ];
        }

        $user = $this->userModel->findById($userId);

        if (!$user) {
            return [
                'success' => false,
                'code' => 404,
                'message' => 'Utilisateur introuvable'
            ];
        }

        if (!password_verify($currentPassword, $user['password_hash'])) {
            $this->auditService->log('password_change_failed', $userId, 'Mot de passe actuel invalide');

            return [
                'success' => false,
                'code' => 400,
                'message' => 'Mot de passe actuel incorrect'
            ];
        }

        if ($currentPassword === $newPassword) {
            return [
                'success' => false,
                'code' => 400,
                'message' => 'Le nouveau mot de passe doit être différent de l\'ancien'
            ];
        }

        try {
            $newHash = password_hash($newPassword, PASSWORD_DEFAULT);

            $updated = $this->userModel->updatePassword($userId, $newHash);

            if ($updated !== true && $updated !== 1) {
                error_log("updatePassword failed userId={$userId} updated=" . var_export($updated, true));
                return [
                    'success' => false,
                    'code' => 500,
                    'message' => 'Impossible de mettre à jour le mot de passe'
                ];
            }

            if ($ok !== true) {
                return [
                    'success' => false,
                    'code' => 500,
                    'message' => 'Impossible de mettre à jour le mot de passe'
                ];
            }

            $this->auditService->logPasswordChanged($userId);

            return [
                'success' => true,
                'message' => 'Mot de passe modifié avec succès'
            ];

        } catch (\Exception $e) {
            error_log("AuthService::changePassword - Error: " . $e->getMessage());

            return [
                'success' => false,
                'code' => 500,
                'message' => 'Erreur lors du changement de mot de passe'
            ];
        }
    }

    public function verifyEmail(string $token): array
    {
        if (empty($token)) {
            return [
                'success' => false,
                'code' => 400,
                'message' => 'Token manquant'
            ];
        }

        try {
            $user = $this->userModel->findByVerificationToken($token);

            if (!$user) {
                return [
                    'success' => false,
                    'code' => 400,
                    'message' => 'Token invalide ou expiré'
                ];
            }

            $this->userModel->updateEmailVerified($user['id']);
            $this->auditService->logEmailVerified((int)$user['id']);
            $token = trim($token);
            if (!preg_match('/^[a-f0-9]{64}$/i', $token)) {
                return ['success'=>false,'code'=>400,'message'=>'Token invalide ou expiré'];
            }

            return [
                'success' => true,
                'userId' => $user['id'],
                'message' => 'Email vérifié avec succès'
            ];

        } catch (\Exception $e) {
            error_log("AuthService::verifyEmail - Error: " . $e->getMessage());

            return [
                'success' => false,
                'code' => 500,
                'message' => 'Erreur lors de la vérification'
            ];
        }
    }

    public function logout(int $userId): array
    {
        try {
            $this->sessionRepository->invalidateAllUserSessions($userId);
            $this->auditService->logLogout($userId);

            return [
                'success' => true,
                'message' => 'Déconnexion réussie'
            ];

        } catch (\Exception $e) {
            error_log("AuthService::logout - Error: " . $e->getMessage());

            return [
                'success' => false,
                'code' => 500,
                'message' => 'Erreur lors de la déconnexion'
            ];
        }
    }

    public function deleteAccount(int $userId, ?string $reason = null): array
    {
        $user = $this->userModel->findById($userId);
        if (!$user) {
            return [
                'success' => false,
                'code' => 404,
                'message' => 'Utilisateur introuvable'
            ];
        }

        try {
            $ok = $this->userModel->softDelete($userId, $reason);
            if (!$ok) {
                return [
                    'success' => false,
                    'code' => 500,
                    'message' => 'Impossible de planifier la suppression du compte'
                ];
            }

            try {
                $this->sessionRepository->invalidateAllUserSessions($userId);
            } catch (\Exception $e) {
                error_log("AuthService::deleteAccount - Session invalidation error: " . $e->getMessage());
            }

            $this->auditService->logAccountDeletionRequested($userId);

            $deletionDate = date('Y-m-d', time() + 60 * 60 * 24 * 30);

            $this->emailService->sendAccountDeletionEmail(
                $userId,
                $user['email'],
                $user['username'],
                $deletionDate
            );

            return [
                'success' => true,
                'message' => 'Suppression du compte programmée. Un email de confirmation a été envoyé.'
            ];
        } catch (\Throwable $e) {
            error_log("AuthService::deleteAccount - Error: " . $e->getMessage());
            return [
                'success' => false,
                'code' => 500,
                'message' => 'Erreur lors de la suppression du compte'
            ];
        }
    }

    public function requestPasswordReset(string $email): array
    {
        try {
            $user = $this->userRepository->findByEmail($email);

            if (!$user) {
                return ['success' => true, 'message' => 'Si ce compte existe, un email a été envoyé'];
            }

            $token   = bin2hex(random_bytes(32));
            $expires = date('Y-m-d H:i:s', time() + 3600); // 1 hour

            $this->userRepository->savePasswordResetToken($user['id'], $token, $expires);

            $this->emailService->sendPasswordResetEmail(
                $user['id'],
                $user['email'],
                $user['username'],
                $token
            );

            $this->auditService->logSecurityEvent($user['id'], 'password_reset_requested', []);

            return ['success' => true, 'message' => 'Si ce compte existe, un email a été envoyé'];

        } catch (\Exception $e) {
            error_log("AuthService::requestPasswordReset - " . $e->getMessage());
            return ['success' => true, 'message' => 'Si ce compte existe, un email a été envoyé'];
        }
    }

    public function resetPassword(string $token, string $newPassword): array
    {
        try {
            $record = $this->userRepository->findByPasswordResetToken($token);

            if (!$record) {
                return [
                    'success' => false,
                    'message' => 'Token invalide ou expiré',
                    'code'    => 400,
                ];
            }

            if (strtotime($record['password_reset_expires_at']) < time()) {
                $this->userRepository->clearPasswordResetToken($record['id']);
                return [
                    'success' => false,
                    'message' => 'Token expiré. Veuillez refaire une demande.',
                    'code'    => 400,
                ];
            }

            $errors = $this->validationService->validatePassword($newPassword);
            if (!empty($errors)) {
                return [
                    'success' => false,
                    'message' => implode(', ', $errors),
                    'code'    => 400,
                ];
            }

            $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
            $this->userRepository->updatePassword($record['id'], $hashedPassword);
            $this->userRepository->clearPasswordResetToken($record['id']);

            $this->sessionRepository->invalidateAllUserSessions($record['id']);

            $this->auditService->logSecurityEvent($record['id'], 'password_reset_completed', []);

            return ['success' => true, 'message' => 'Mot de passe réinitialisé avec succès'];

        } catch (\Exception $e) {
            error_log("AuthService::resetPassword - " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Erreur serveur',
                'code'    => 500,
            ];
        }
    }

    public function resendVerificationEmail(string $email): array
    {
        try {
            $user = $this->userRepository->findByEmail($email);

            if (!$user) {
                return ['success' => true, 'message' => 'Email de vérification envoyé si le compte existe'];
            }

            if (!empty($user['email_verified_at'])) {
                return [
                    'success' => false,
                    'message' => 'Ce compte est déjà vérifié',
                    'code'    => 400,
                ];
            }

            $token = bin2hex(random_bytes(32));
            $this->userRepository->saveVerificationToken($user['id'], $token);

            $this->emailService->sendVerificationEmail(
                $user['id'],
                $user['email'],
                $user['username'],
                $token
            );

            $this->auditService->logSecurityEvent($user['id'], 'verification_email_resent', []);

            return ['success' => true, 'message' => 'Email de vérification envoyé'];

        } catch (\Exception $e) {
            error_log("AuthService::resendVerificationEmail - " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Erreur serveur',
                'code'    => 500,
            ];
        }
    }

    public function generateToken(array $payload): string
    {
        if (isset($payload['sub'])) {
            return $this->tokenService->generateTokenFromPayload($payload);
        }

        return $this->tokenService->generateToken($payload);
    }

    public function refreshToken(string $refreshToken): array
    {
        return $this->tokenService->refreshToken($refreshToken);
    }
}
