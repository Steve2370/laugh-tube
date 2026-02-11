<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\LogRepository;
use App\Repositories\SessionRepository;
use App\Repositories\UserRepository;
use PDOException;

class AuthService
{
    private UserRepository $userRepo;
    private LogRepository $logRepo;
    public function __construct(
        private UserRepository $userModel,
        LogRepository $logRepo,
        private TokenService $tokenService,
        private ValidationService $validationService,
        private SessionRepository $sessionRepository,
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

        if (!$user || !password_verify($password, $user['password_hash'])) {
//            $this->auditService->logSecurityEvent(
//                null,
//                'login_failed',
//                ['email' => $email, 'reason' => 'invalid_credentials']
//            );

            return [
                'success' => false,
                'code' => 401,
                'message' => 'Email ou mot de passe incorrect'
            ];
        }

        if (isset($user['deleted_at']) && $user['deleted_at'] !== null) {
//            $this->auditService->logSecurityEvent(
//                $user['id'],
//                'login_failed',
//                ['email' => $email, 'reason' => 'account_deleted']
//            );

            return [
                'success' => false,
                'code' => 403,
                'message' => 'Ce compte a été désactivé'
            ];
        }
        $accessToken = $this->tokenService->generateToken($user);
        $refreshToken = $this->tokenService->generateRefreshToken($user);

//        try {
//            $this->sessionRepository->createSession(
//                $user['id'],
//                $refreshToken,
//                $_SERVER['REMOTE_ADDR'] ?? null,
//                $_SERVER['HTTP_USER_AGENT'] ?? null
//            );
//        } catch (\Exception $e) {
//            error_log("AuthService::login - Session creation error: " . $e->getMessage());
//        }

//        $this->auditService->logSecurityEvent(
//            $user['id'],
//            'user_login',
//            ['email' => $email, 'method' => 'password']
//        );

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
                    'profile_image' => $user['profile_image'] ?? null,
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
                'email_verified' => true,
                'verification_token' => bin2hex(random_bytes(32)) ?? null,
                'verification_token_expires' => date('Y-m-d H:i:s', time() + 3600) ?? null,
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

            $user = $this->userModel->findById($userId);
            if (!$user) {
                $user = [
                    'id' => $userId,
                    'username' => $username,
                    'email' => $email,
                    'role' => 'membre',
                    'profile_image' => null,
                    'email_verified' => false
                ];
            }

//            $verificationToken = bin2hex(random_bytes(32));
//            $this->userModel->saveEmailVerificationToken($userId, $verificationToken);

            // TODO: Envoyer email de vérification
            // $this->emailService->sendVerificationEmail($email, $verificationToken);

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

//            $this->auditService->logSecurityEvent(
//                $userId,
//                'user_registered',
//                ['username' => $username, 'email' => $email]
//            );

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
                        'profile_image' => $user['profile_image'] ?? null,
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
                'profile_image' => $user['profile_image'] ?? null,
                'profile_cover' => $user['profile_cover'] ?? null,
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
//            $this->auditService->logSecurityEvent(
//                $userId,
//                'password_change_failed',
//                ['reason' => 'invalid_current_password']
//            );

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
            $this->userModel->updatePassword($userId, $newPassword);
//            $this->auditService->logSecurityEvent(
//                $userId,
//                'password_changed',
//                []
//            );

            try {
                $this->sessionRepository->invalidateAllUserSessions($userId);
            } catch (\Exception $e) {
                error_log("AuthService::changePassword - Session invalidation error: " . $e->getMessage());
            }

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
            $user = $this->userModel->findByEmailVerificationToken($token);

            if (!$user) {
                return [
                    'success' => false,
                    'code' => 400,
                    'message' => 'Token invalide ou expiré'
                ];
            }
            $this->userModel->markEmailAsVerified($user['id']);
            $this->auditService->logSecurityEvent(
                $user['id'],
                'email_verified',
                ['email' => $user['email']]
            );

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

    public function logSecurityEvent(?int $userId, ?string $eventType, array $metadata = []): void
    {
        if (!$eventType || trim($eventType) === '') {
            error_log("AUDIT skipped: eventType missing");
            return;
        }

        try {

        } catch (\Throwable $e) {
            error_log("AUDIT failed (ignored): " . $e->getMessage());

        }
    }


    public function logout(int $userId): array
    {
        try {
            $this->sessionRepository->invalidateAllUserSessions($userId);
//            $this->auditService->logSecurityEvent(
//                $userId,
//                'user_logout',
//                []
//            );

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

    public function deleteAccount($user_id, string $param, null $param1)
    {
    }
}