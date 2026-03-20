<?php

require_once __DIR__ . '/../bootstrap.php';

use App\Interfaces\DatabaseInterface;
use App\Services\AuditService;
use App\Services\ValidationService;
use App\Utils\JsonResponse;
use App\Utils\SecurityHelper;

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    JsonResponse::methodNotAllowed(['error' => 'Méthode non autorisée']);
}

try {
    $container = require __DIR__ . '/../config/container.php';

    $db = $container->get(DatabaseInterface::class);
    $validationService = $container->get(ValidationService::class);
    $auditService = $container->get(AuditService::class);

    $data = json_decode(file_get_contents('php://input'), true);
    $token = SecurityHelper::sanitizeInput($data['token'] ?? '');
    $newPassword = $data['password'] ?? '';
    $confirmPassword = $data['confirm_password'] ?? '';

    if (empty($token)) {
        JsonResponse::badRequest(['error' => 'Token requis']);
    }

    if (empty($newPassword)) {
        JsonResponse::badRequest(['error' => 'Mot de passe requis']);
    }

    if ($newPassword !== $confirmPassword) {
        JsonResponse::badRequest(['error' => 'Les mots de passe ne correspondent pas']);
    }

    $errors = $validationService->validatePasswordWithErrors($newPassword);
    if (!empty($errors)) {
        JsonResponse::validationError($errors);
    }

    $user = $db->fetchOne(
        "SELECT id, username, password_reset_token, password_reset_expires_at 
         FROM users 
         WHERE password_reset_token = $1 
         AND deleted_at IS NULL",
        [$token]
    );

    if (!$user) {
        JsonResponse::badRequest([
            'error' => 'Token invalide ou expiré'
        ]);
    }

    $expiresAt = new DateTime($user['password_reset_expires_at']);
    $now = new DateTime();

    if ($now > $expiresAt) {
        JsonResponse::badRequest([
            'error' => 'Token expiré',
            'message' => 'Ce lien de réinitialisation a expiré'
        ]);
    }

    $passwordHash = SecurityHelper::hashPassword($newPassword);

    $db->execute(
        "UPDATE users 
         SET password_hash = $1,
             password_reset_token = NULL,
             password_reset_expires_at = NULL,
             updated_at = NOW()
         WHERE id = $2",
        [$passwordHash, $user['id']]
    );

    $db->execute(
        "UPDATE sessions SET is_valid = FALSE WHERE user_id = $1",
        [$user['id']]
    );

    $auditService->logSecurityEvent(
        $user['id'],
        'password_changed',
        ['method' => 'reset_token']
    );

    JsonResponse::success([
        'success' => true,
        'message' => 'Mot de passe réinitialisé avec succès'
    ]);

} catch (\Exception $e) {
    error_log("resetPassword - Error: " . $e->getMessage());
    JsonResponse::serverError(['error' => 'Erreur serveur']);
}