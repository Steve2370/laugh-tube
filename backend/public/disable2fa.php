<?php

require_once __DIR__ . '/../bootstrap.php';

use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthMiddleware;
use App\Middleware\InputSanitizerMiddleware;
use App\Services\AuditService;
use App\Services\TwoFactorService;
use App\Utils\JsonResponse;
use App\Utils\SecurityHelper;

header('Content-Type: application/json');

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

    if (!$authMiddleware->handle()) {
        JsonResponse::unauthorized(['error' => 'Non authentifié']);
    }

    $userId = $authMiddleware->getUserId();

    $password = SecurityHelper::sanitizeInput($input['password'] ?? '');

    if (empty($password)) {
        $auditService->logSecurityEvent($userId, '2fa_disable_attempt_no_password', []);
        JsonResponse::badRequest([
            'error' => 'Mot de passe requis',
            'message' => 'Veuillez fournir votre mot de passe'
        ]);
    }

    $result = $twoFactorService->disable2FA($userId, $password);

    if (!$result['success']) {
        JsonResponse::badRequest($result);
    }

    JsonResponse::success($result);

} catch (\Exception $e) {
    error_log("disable2fa - Error: " . $e->getMessage());
    JsonResponse::serverError(['error' => 'Erreur serveur']);
}