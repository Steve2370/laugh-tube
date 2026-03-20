<?php

require_once __DIR__ . '/../bootstrap.php';

use App\Interfaces\DatabaseInterface;
use App\Services\AuditService;
use App\Services\EmailService;
use App\Utils\JsonResponse;
use App\Utils\SecurityHelper;

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    JsonResponse::methodNotAllowed(['error' => 'Méthode non autorisée']);
}

try {
    $container = require __DIR__ . '/../config/container.php';

    $db = $container->get(DatabaseInterface::class);
    $emailService = $container->get(EmailService::class);
    $auditService = $container->get(AuditService::class);

    $data = json_decode(file_get_contents('php://input'), true);
    $email = SecurityHelper::sanitizeEmail($data['email'] ?? '');

    if (empty($email)) {
        JsonResponse::badRequest(['error' => 'Email requis']);
    }

    $user = $db->fetchOne(
        "SELECT id, username, email FROM users WHERE email = $1 AND deleted_at IS NULL",
        [$email]
    );

    if (!$user) {
        JsonResponse::success([
            'success' => true,
            'message' => 'Si cet email existe, un lien de réinitialisation a été envoyé'
        ]);
    }
    $token = SecurityHelper::generatePasswordResetToken();
    $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

    $db->execute(
        "UPDATE users 
         SET password_reset_token = $1,
             password_reset_expires_at = $2,
             updated_at = NOW()
         WHERE id = $3",
        [$token, $expiresAt, $user['id']]
    );

    $resetLink = $_ENV['FRONTEND_URL'] . '/reset-password?token=' . $token;

    $emailService->sendPasswordResetEmail(
        $user['email'],
        $user['username'],
        $resetLink
    );

    $auditService->logSecurityEvent(
        $user['id'],
        'password_reset_requested',
        ['email' => SecurityHelper::maskEmail($email)]
    );

    JsonResponse::success([
        'success' => true,
        'message' => 'Si cet email existe, un lien de réinitialisation a été envoyé'
    ]);

} catch (\Exception $e) {
    error_log("resetPasswordRequest - Error: " . $e->getMessage());
    JsonResponse::serverError(['error' => 'Erreur serveur']);
}