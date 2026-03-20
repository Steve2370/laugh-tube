<?php
require_once __DIR__ . '/../bootstrap.php';

use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthMiddleware;
use App\Middleware\InputSanitizerMiddleware;
use App\Services\AuditService;
use App\Services\EmailService;
use App\Services\TwoFactorService;
use App\Utils\JsonResponse;
use App\Utils\SecurityHelper;

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    JsonResponse::methodNotAllowed(['error' => 'Méthode non autorisée']);
}

try {
    $input = InputSanitizerMiddleware::validateJsonInput();
    if (!$input) exit;

    $container = require __DIR__ . '/../config/container.php';

    $authMiddleware = $container->get(AuthMiddleware::class);
    $twoFactorService = $container->get(TwoFactorService::class);
    $db = $container->get(DatabaseInterface::class);
    $auditService = $container->get(AuditService::class);
    $emailService = $container->get(EmailService::class);

    if (!$authMiddleware->handle()) {
        JsonResponse::unauthorized(['error' => 'Non authentifié']);
    }

    $userId = $authMiddleware->getUserId();

    $code = SecurityHelper::sanitizeInput($input['code'] ?? '');

    if (empty($code)) {
        JsonResponse::badRequest(['error' => 'Code requis']);
    }

    $user = $db->fetchOne(
        "SELECT id, email, username, two_fa_secret FROM users WHERE id = $1",
        [$userId]
    );

    if (!$user || empty($user['two_fa_secret'])) {
        JsonResponse::badRequest([
            'error' => '2FA non initialisée',
            'message' => "Appelez d'abord /enable-2fa.php"
        ]);
    }

    if (!$twoFactorService->verifyCode($user['two_fa_secret'], $code)) {
        $auditService->logSecurityEvent($userId, '2fa_verification_failed', []);
        JsonResponse::badRequest(['error' => 'Code invalide']);
    }

    $db->execute(
        "UPDATE users SET two_fa_enabled = TRUE, updated_at = NOW() WHERE id = $1",
        [$userId]
    );

    $emailService->send2FAEnabledEmail($userId, $user['email'], $user['username']);
    $auditService->logSecurityEvent($userId, '2fa_enabled', []);

    JsonResponse::success([
        'message' => 'Authentification 2FA activée avec succès'
    ]);

} catch (Exception $e) {
    error_log("2FA verification error: " . $e->getMessage());
    JsonResponse::serverError(['error' => 'Erreur serveur']);
}