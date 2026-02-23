<?php
namespace App\Controllers;

use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthMiddleware;
use App\Middleware\InputSanitizerMiddleware;
use App\Repositories\SessionRepository;
use App\Services\AuditService;
use App\Services\AuthService;
use App\Services\EmailService;
use App\Services\TokenService;
use App\Services\TwoFactorService;
use App\Services\ValidationService;
use App\Utils\JsonResponse;
use App\Utils\SecurityHelper;

class AuthController
{

    public function __construct(
        private AuthService $authService,
        private ValidationService $validationService,
        private AuditService $auditService,
        private AuthMiddleware $authMiddleware,
        private DatabaseInterface $db,
        private SessionRepository $sessionRepository,
        private TwoFactorService $twoFactorService,
        private TokenService $tokenService,
        private EmailService $emailService
    ) {}

    public function register(): void
    {
        try {
            $raw = file_get_contents('php://input');
            $data = json_decode($raw, true);

            if (!is_array($data)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Body JSON invalide'
                ]);
                return;
            }


            $username = SecurityHelper::sanitizeInput($data['username'] ?? '');
            $email = SecurityHelper::sanitizeInput($data['email'] ?? '');
            $password = $data['password'] ?? '';

            $validationErrors = $this->validationService->validateRegistration([
                'username' => $username,
                'email' => $email,
                'password' => $password
            ]);
            error_log("REGISTER raw=" . substr($raw, 0, 500));
            error_log("REGISTER decoded keys=" . implode(',', array_keys($data ?? [])));
            error_log("REGISTER username=[" . ($data['username'] ?? 'MISSING') . "] email=[" . ($data['email'] ?? 'MISSING') . "]");
            error_log("REGISTER content-type=" . ($_SERVER['CONTENT_TYPE'] ?? 'none'));
            error_log("REGISTER sanitized username=<$username> email=<$email> pass_len=" . strlen($password));



            if (!empty($validationErrors)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'errors' => $validationErrors
                ]);
                return;
            }

            $result = $this->authService->register($username, $email, $password);

            if (!$result['success']) {
                http_response_code($result['code'] ?? 500);
                echo json_encode([
                    'success' => false,
                    'error' => $result['message']
                ]);
                return;
            }

            $this->auditService->logSecurityEvent(
                $result['userId'],
                'user_registered',
                ['username' => $username, 'email' => $email]
            );

            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Compte créé avec succès. Vérifiez votre email.',
                'userId' => $result['userId']
            ]);

        } catch (\Exception $e) {
            error_log("AuthController::register - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de l\'inscription'
            ]);
        }
    }

    public function login(): void
    {
        try {
            $data = json_decode(file_get_contents('php://input'), true) ?? [];

            $email = SecurityHelper::sanitizeInput($data['email'] ?? '');
            $password = $data['password'] ?? '';

            if (empty($email) || empty($password)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Email et mot de passe requis'
                ]);
                return;
            }

            $result = $this->authService->login($email, $password);

            if (!$result['success']) {
                http_response_code($result['code'] ?? 401);
                echo json_encode([
                    'success' => false,
                    'error' => $result['message'] ?? 'Erreur login'
                ]);
                return;
            }

            if (!empty($result['requires_2fa'])) {
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'requires_2fa' => true,
                    'user_id' => $result['user_id'],
                ]);
                return;
            }

            $this->auditService->logSecurityEvent(
                $result['userId'],
                'user_login',
                ['email' => $email]
            );

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'token' => $result['data']['access_token'] ?? null,
                'refresh_token' => $result['data']['refresh_token'] ?? null,
                'user' => $result['data']['user'] ?? null
            ]);

        } catch (\Exception $e) {
            error_log("AuthController::login - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la connexion'
            ]);
        }
    }

    public function verifyEmail(): void
    {
        try {
            $token = SecurityHelper::sanitizeInput($_GET['token'] ?? '');

            if (empty($token)) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => 'Token manquant'
                ]);
                return;
            }

            $result = $this->authService->verifyEmail($token);

            if (!$result['success']) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => $result['message']
                ]);
                return;
            }

            $this->auditService->logSecurityEvent(
                $result['userId'],
                'email_verified',
                []
            );

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Email vérifié avec succès'
            ]);

        } catch (\Exception $e) {
            error_log("AuthController::verifyEmail - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la vérification'
            ]);
        }
    }

    public function logout(): void
    {
        try {
            $currentUser = $this->authMiddleware->handleOptional();
            if (!is_array($currentUser)) {
                JsonResponse::unauthorized(['success' => false, 'error' => 'Non authentifié']);
                return;
            }
            $userId = (int)($currentUser['sub'] ?? 0);
            $this->authService->logout($userId);
            $this->auditService->logSecurityEvent($userId, 'user_logout', []);

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Déconnexion réussie'
            ]);

        } catch (\Exception $e) {
            error_log("AuthController::logout - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors de la déconnexion'
            ]);
        }
    }

    public function me(): void
    {
        try {
            $currentUser = $this->authMiddleware->handleOptional();
            if (!is_array($currentUser)) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Non authentifié']);
                return;
            }

            $userId = (int)($currentUser['sub'] ?? 0);
            $user = $this->db->fetchOne(
                "SELECT id, username, email, role, avatar_url, cover_url, email_verified, two_fa_enabled, deleted_at
             FROM users WHERE id = $1 AND deleted_at IS NULL",
                [$userId]
            );

            if (!$user) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Non authentifié']);
                return;
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'user' => [
                    'id'             => $user['id'],
                    'username'       => $user['username'],
                    'email'          => $user['email'],
                    'role'           => $user['role'],
                    'email_verified' => $user['email_verified'],
                    'two_fa_enabled' => $user['two_fa_enabled'],
                    'avatar_url'     => $user['avatar_url'] ?? null,
                    'cover_url'      => $user['cover_url'] ?? null,
                ]
            ]);
        } catch (\Throwable $e) {
            error_log("AuthController::me - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
        }
    }

    public function changePassword(): void
    {
        try {
            $ok = $this->authMiddleware->handle();
            if (!$ok) {
                JsonResponse::unauthorized(['success' => false, 'error' => 'Non autorisé']);
                return;
            }
            $currentUser = $this->authMiddleware->getUser();

            if (!is_array($currentUser)) {
                JsonResponse::unauthorized(['success' => false, 'error' => 'Non autorisé']);
                return;
            }

            $raw = file_get_contents('php://input') ?: '';
            $data = json_decode($raw, true);
            if (!is_array($data)) {
                JsonResponse::badRequest(['success' => false, 'error' => 'JSON invalide']);
                return;
            }

            $currentPassword = (string)($data['current_password'] ?? '');
            $newPassword     = (string)($data['new_password'] ?? '');

            $errors = [];
            if ($currentPassword === '') $errors['current_password'] = 'Mot de passe actuel requis';
            if ($newPassword === '')     $errors['new_password'] = 'Nouveau mot de passe requis';

            if ($newPassword !== '' && strlen($newPassword) < 8) {
                $errors['new_password'] = 'Le nouveau mot de passe doit contenir au moins 8 caractères';
            }

            if (!empty($errors)) {
                JsonResponse::json(['success' => false, 'errors' => $errors], 400);
                return;
            }

            $userId = (int)($currentUser['user_id'] ?? $currentUser['sub'] ?? 0);
            if ($userId <= 0) {
                JsonResponse::serverError(['success' => false, 'error' => 'Utilisateur invalide']);
                return;
            }

            $result = $this->authService->changePassword($userId, $currentPassword, $newPassword);

            if (!is_array($result)) {
                error_log("AuthService::changePassword returned non-array: " . gettype($result));
                JsonResponse::serverError(['success' => false, 'error' => 'Erreur serveur']);
                return;
            }
            error_log("changePassword userId={$userId} result=" . json_encode($result));

            if (($result['success'] ?? false) !== true) {
                JsonResponse::json([
                    'success' => false,
                    'error' => (string)($result['message'] ?? 'Changement refusé')
                ], (int)($result['code'] ?? 400));
                return;
            }

            $this->auditService->logSecurityEvent($userId, 'password_changed', []);
            $userInfo = $this->db->fetchOne(
                'SELECT email, username FROM users WHERE id = $1',
                [$userId]
            );
            if ($userInfo) {
                $this->emailService->sendPasswordChangedEmail(
                    $userId,
                    $userInfo['email'],
                    $userInfo['username']
                );
            }

            JsonResponse::success([
                'success' => true,
                'message' => 'Mot de passe modifié avec succès'
            ]);
        } catch (\Throwable $e) {
            error_log("AuthController::changePassword - Error: " . $e->getMessage());
            JsonResponse::serverError(['success' => false, 'error' => 'Erreur lors du changement de mot de passe']);
        }
    }

    public function refresh(): void
    {
        try {
            $input = InputSanitizerMiddleware::validateJsonInput();
            $refreshToken = $input['refresh_token'] ?? null;

            if (!$refreshToken) {
                JsonResponse::badRequest(['error' => 'refresh_token requis']);
                return;
            }

            $result = $this->tokenService->refreshToken($refreshToken);

            if (!$result['success']) {
                http_response_code($result['code'] ?? 401);
                echo json_encode(['error' => $result['message']]);
                return;
            }

            JsonResponse::success($result);
        } catch (\Exception $e) {
            error_log("AuthController::refresh - " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function verify2FALogin(): void
    {
        try {
            $input = InputSanitizerMiddleware::validateJsonInput();
            if (!$input) return;

            $userId = (int)($input['user_id'] ?? 0);
            $code   = SecurityHelper::sanitizeInput($input['code'] ?? '');

            if (empty($userId) || empty($code)) {
                JsonResponse::badRequest(['error' => 'user_id et code requis']);
                return;
            }

            $result = $this->twoFactorService->verifyCode($userId, $code);

            if (!$result['success']) {
                $httpCode = $result['code'] ?? 401;
                http_response_code($httpCode);
                echo json_encode(['error' => $result['message']]);
                return;
            }

            $user = $this->db->fetchOne(
                "SELECT id, username, email, role FROM users WHERE id = $1 AND deleted_at IS NULL",
                [$userId]
            );

            if (!$user) {
                JsonResponse::notFound(['error' => 'Utilisateur introuvable']);
                return;
            }

            $ip        = SecurityHelper::getClientIp();
            $userAgent = SecurityHelper::getUserAgent();
            $sessionId = $this->sessionRepository->createSession([
                'user_id'    => $userId,
                'token'      => bin2hex(random_bytes(32)),
                'ip_address' => $ip,
                'user_agent' => $userAgent,
                'expires_at' => date('Y-m-d H:i:s', time() + 604800),
            ]);

            $token = $this->authService->generateToken([
                'sub'            => $userId,
                'username'       => $user['username'],
                'email'          => $user['email'],
                'role'           => $user['role'],
                'session_id'     => $sessionId,
                'two_fa_verified' => true,
            ]);

            $this->auditService->logSecurityEvent($userId, '2fa_verified', ['method' => $result['method'] ?? 'totp']);

            JsonResponse::success([
                'success' => true,
                'token'   => $token,
                'user'    => [
                    'id'       => $user['id'],
                    'username' => $user['username'],
                    'email'    => $user['email'],
                    'role'     => $user['role'],
                ],
            ]);
        } catch (\Exception $e) {
            error_log("AuthController::verify2FALogin - " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function check2FAStatus(): void
    {
        try {
            $currentUser = $this->authMiddleware->handleOptional();
            if (!is_array($currentUser)) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
                return;
            }
            $userId = (int)($currentUser['sub'] ?? 0);
            $result = $this->twoFactorService->get2FAStatus($userId);
            JsonResponse::success($result);
        } catch (\Exception $e) {
            error_log("AuthController::check2FAStatus - " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function enable2FA(): void
    {
        try {
            $currentUser = $this->authMiddleware->handleOptional();
            if (!is_array($currentUser)) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
                return;
            }
            $userId = (int)($currentUser['sub'] ?? 0);
            $result = $this->twoFactorService->enable2FA($userId);

            if (!$result['success']) {
                http_response_code($result['code'] ?? 400);
                echo json_encode(['error' => $result['message']]);
                return;
            }

            $user = $this->db->fetchOne('SELECT email, username FROM users WHERE id = $1', [$userId]);
            if ($user) {
                $this->emailService->send2FAEnabledEmail($userId, $user['email'], $user['username']);
            }

            JsonResponse::success([
                'secret'       => $result['secret'],
                'qr_code'      => $result['qr_code_url'],
                'backup_codes' => $result['backup_codes'],
                'message'      => $result['message'],
            ]);
        } catch (\Exception $e) {
            error_log("AuthController::enable2FA - " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function verify2FASetup(): void
    {
        try {
            $currentUser = $this->authMiddleware->handleOptional();
            if (!is_array($currentUser)) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
                return;
            }
            $userId = (int)($currentUser['sub'] ?? 0);

            $input = InputSanitizerMiddleware::validateJsonInput();
            if (!$input) return;
            $code   = SecurityHelper::sanitizeInput($input['code'] ?? '');

            if (empty($code)) {
                JsonResponse::badRequest(['error' => 'Code requis']);
                return;
            }

            $result = $this->twoFactorService->verify2FASetup($userId, $code);

            if (!$result['success']) {
                http_response_code($result['code'] ?? 400);
                echo json_encode(['error' => $result['message']]);
                return;
            }

            $user = $this->db->fetchOne('SELECT email, username FROM users WHERE id = $1', [$userId]);
            if ($user) {
                $this->emailService->send2FAEnabledEmail($userId, $user['email'], $user['username']);
            }

            JsonResponse::success(['message' => $result['message']]);
        } catch (\Exception $e) {
            error_log("AuthController::verify2FASetup - " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function disable2FA(): void
    {
        try {
            $currentUser = $this->authMiddleware->handleOptional();
            if (!is_array($currentUser)) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
                return;
            }
            $userId = (int)($currentUser['sub'] ?? 0);

            $input = InputSanitizerMiddleware::validateJsonInput();
            if (!$input) return;

            $userId   = (int)($currentUser['sub'] ?? 0);
            $password = $input['password'] ?? '';

            if (empty($password)) {
                JsonResponse::badRequest(['error' => 'Mot de passe requis']);
                return;
            }

            $result = $this->twoFactorService->disable2FA($userId, $password);

            if (!$result['success']) {
                http_response_code($result['code'] ?? 400);
                echo json_encode(['error' => $result['message']]);
                return;
            }

            $user = $this->db->fetchOne('SELECT email, username FROM users WHERE id = $1', [$userId]);
            if ($user) {
                $this->emailService->send2FADisabledEmail($userId, $user['email'], $user['username']);
            }

            JsonResponse::success(['message' => $result['message']]);
        } catch (\Exception $e) {
            error_log("AuthController::disable2FA - " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function requestPasswordReset(): void
    {
        try {
            $input = InputSanitizerMiddleware::validateJsonInput();
            if (!$input) return;

            $email = SecurityHelper::sanitizeInput($input['email'] ?? '');

            if (empty($email)) {
                JsonResponse::badRequest(['error' => 'Email requis']);
                return;
            }

            $result = $this->authService->requestPasswordReset($email);
            JsonResponse::success(['message' => 'Si ce compte existe, un email a été envoyé']);
        } catch (\Exception $e) {
            error_log("AuthController::requestPasswordReset - " . $e->getMessage());
            JsonResponse::success(['message' => 'Si ce compte existe, un email a été envoyé']);
        }
    }

    public function resetPassword(): void
    {
        try {
            $input = InputSanitizerMiddleware::validateJsonInput();
            if (!$input) return;

            $token       = SecurityHelper::sanitizeInput($input['token']        ?? '');
            $newPassword = $input['new_password'] ?? '';

            if (empty($token) || empty($newPassword)) {
                JsonResponse::badRequest(['error' => 'Token et nouveau mot de passe requis']);
                return;
            }

            $result = $this->authService->resetPassword($token, $newPassword);

            if (!$result['success']) {
                http_response_code($result['code'] ?? 400);
                echo json_encode(['error' => $result['message']]);
                return;
            }

            if (!empty($result['userId']) && !empty($result['email'])) {
                $this->emailService->sendPasswordChangedEmail(
                    $result['userId'],
                    $result['email'],
                    $result['username'] ?? ''
                );
            }

            JsonResponse::success(['message' => 'Mot de passe réinitialisé avec succès']);
        } catch (\Exception $e) {
            error_log("AuthController::resetPassword - " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function resendVerification(): void
    {
        try {
            $input = InputSanitizerMiddleware::validateJsonInput();
            if (!$input) return;

            $email = SecurityHelper::sanitizeInput($input['email'] ?? '');

            if (empty($email)) {
                JsonResponse::badRequest(['error' => 'Email requis']);
                return;
            }

            $result = $this->authService->resendVerificationEmail($email);

            if (!$result['success']) {
                http_response_code($result['code'] ?? 400);
                echo json_encode(['error' => $result['message']]);
                return;
            }

            JsonResponse::success(['message' => 'Email de vérification envoyé']);
        } catch (\Exception $e) {
            error_log("AuthController::resendVerification - " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function verify2FA(): void
    {
        $this->verify2FASetup();
    }

    public function cancelAccountDeletion(): void
    {
        try {
            $currentUser = $this->authMiddleware->handleOptional();
            if (!is_array($currentUser)) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
                return;
            }
            $userId = (int)($currentUser['sub'] ?? 0);

            $user = $this->db->fetchOne(
                "SELECT id, deletion_scheduled_at FROM users WHERE id = $1",
                [$userId]
            );

            if (!$user || empty($user['deletion_scheduled_at'])) {
                JsonResponse::badRequest(['error' => 'Aucune suppression en attente']);
                return;
            }

            $this->db->execute(
                "UPDATE users SET deletion_scheduled_at = NULL, deleted_at = NULL, updated_at = NOW() WHERE id = $1",
                [$userId]
            );

            $this->auditService->logSecurityEvent($userId, 'account_deletion_cancelled', []);

            JsonResponse::success(['message' => 'Suppression annulée']);
        } catch (\Exception $e) {
            error_log("AuthController::cancelAccountDeletion - " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }

    public function deleteAccount(): void
    {
        try {
            $currentUser = $this->authMiddleware->handleOptional();
            if (!is_array($currentUser)) {
                JsonResponse::unauthorized(['error' => 'Non authentifié']);
                return;
            }
            $userId = (int)($currentUser['sub'] ?? 0);

            $input = InputSanitizerMiddleware::validateJsonInput();
            if (!$input) return;

            $userId   = (int)($currentUser['sub'] ?? 0);
            $password = $input['password'] ?? '';
            $reason   = isset($input['reason']) ? SecurityHelper::sanitizeInput($input['reason']) : null;

            if (empty($password)) {
                $this->auditService->logSecurityEvent($userId, 'account_deletion_attempt_no_password', []);
                JsonResponse::badRequest(['error' => 'Mot de passe requis']);
                return;
            }

            $result = $this->authService->deleteAccount($userId, $password, $reason);

            if (!$result['success']) {
                http_response_code($result['code'] ?? 400);
                echo json_encode(['error' => $result['message']]);
                return;
            }

            JsonResponse::success($result);
        } catch (\Exception $e) {
            error_log("AuthController::deleteAccount - " . $e->getMessage());
            JsonResponse::serverError(['error' => 'Erreur serveur']);
        }
    }
}