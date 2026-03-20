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
        "SELECT id, username, email, email_verified FROM users WHERE email = $1 AND deleted_at IS NULL",
        [$email]
    );

    if (!$user) {
        JsonResponse::success([
            'success' => true,
            'message' => 'Si cet email existe, un lien de vérification a été envoyé'
        ]);
    }

    if ($user['email_verified']) {
        JsonResponse::success([
            'success' => true,
            'message' => 'Email déjà vérifié'
        ]);
    }

    $token = SecurityHelper::generateEmailVerificationToken();
    $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));

    $db->execute(
        "UPDATE users SET email_verification_token = $1, email_verification_expires_at = $2 WHERE id = $3",
        [$token, $expiresAt, $user['id']]
    );

    $verificationLink = $_ENV['FRONTEND_URL'] . '/verify-email?token=' . $token;

    $emailService->sendVerificationEmail(
        $user['email'],
        $user['username'],
        $verificationLink
    );

    $auditService->logSecurityEvent(
        $user['id'],
        'verification_email_resent',
        ['email' => SecurityHelper::maskEmail($email)]
    );

    JsonResponse::success([
        'success' => true,
        'message' => 'Email de vérification envoyé'
    ]);

} catch (\Exception $e) {
    error_log("resendVerification - Error: " . $e->getMessage());
    JsonResponse::serverError(['error' => 'Erreur serveur']);
}