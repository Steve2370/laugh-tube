<?php
namespace App\Controllers;

use App\Middleware\AuthMiddleware;
use App\Services\AuditService;
use App\Services\AuthService;
use App\Services\ValidationService;
use App\Utils\SecurityHelper;

class AuthController
{
    public function __construct(
        private AuthService $authService,
        private ValidationService $validationService,
        private AuditService $auditService,
        private AuthMiddleware $authMiddleware
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
            $currentUser = $this->authMiddleware->handle();

            if (!$currentUser) {
                http_response_code(401);
                echo json_encode([
                    'success' => false,
                    'error' => 'Non authentifié'
                ]);
                return;
            }

            $this->authService->logout($currentUser['user_id']);
            $this->auditService->logSecurityEvent(
                $currentUser['user_id'],
                'user_logout',
                []
            );

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
            if (!$this->authMiddleware->handle()) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Non authentifié']);
                return;
            }

            $currentUser = $this->authMiddleware->getUser();
            if (!$currentUser) {
                http_response_code(401);
                echo json_encode(['success' => false, 'error' => 'Non authentifié']);
                return;
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'user' => [
                    'id' => $currentUser['user_id'],
                    'username' => $currentUser['username'],
                    'email' => $currentUser['email'],
                    'role' => $currentUser['role'],
                    'email_verified' => $currentUser['email_verified'],
                    'two_fa_enabled' => $currentUser['two_fa_enabled'],
                    'profile_image' => $currentUser['profile_image'] ?? null,
                    'profile_cover' => $currentUser['profile_cover'] ?? null
                ]
            ]);
        } catch (\Throwable $e) {
            error_log("AuthController::me - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Erreur lors de la récupération du profil']);
        }
    }

    public function changePassword(): void
    {
        try {
            $currentUser = $this->authMiddleware->handle();

            if (!$currentUser) {
                http_response_code(401);
                return;
            }

            $data = json_decode(file_get_contents('php://input'), true) ?? [];

            $currentPassword = $data['current_password'] ?? '';
            $newPassword = $data['new_password'] ?? '';

            $errors = [];
            if (empty($currentPassword)) {
                $errors['current_password'] = 'Mot de passe actuel requis';
            }
            if (empty($newPassword)) {
                $errors['new_password'] = 'Nouveau mot de passe requis';
            }

            if (!empty($errors)) {
                http_response_code(400);
                echo json_encode(['success' => false, 'errors' => $errors]);
                return;
            }

            $result = $this->authService->changePassword(
                $currentUser['user_id'],
                $currentPassword,
                $newPassword
            );

            if (!$result['success']) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'error' => $result['message']
                ]);
                return;
            }

            $this->auditService->logSecurityEvent(
                $currentUser['user_id'],
                'password_changed',
                []
            );

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Mot de passe modifié avec succès'
            ]);

        } catch (\Exception $e) {
            error_log("AuthController::changePassword - Error: " . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Erreur lors du changement de mot de passe'
            ]);
        }
    }

    public function refresh()
    {
    }

    public function verify2FALogin()
    {
    }

    public function check2FAStatus()
    {
    }

    public function enable2FA()
    {
    }

    public function verify2FASetup()
    {
    }

    public function disable2FA()
    {
    }

    public function requestPasswordReset()
    {
    }

    public function resetPassword()
    {
    }

    public function resendVerification()
    {
    }

    public function verify2FA()
    {
    }
}