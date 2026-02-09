<?php
require_once __DIR__ . '/../bootstrap.php';

use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthMiddleware;
use App\Middleware\InputSanitizerMiddleware;
use App\Services\AuthService;
use App\Services\AuditService;
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
    $authService = $container->get(AuthService::class);
    $db = $container->get(DatabaseInterface::class);
    $auditService = $container->get(AuditService::class);

    if (!$authMiddleware->handle()) {
        JsonResponse::unauthorized(['error' => 'Non authentifié']);
    }

    $userId = $authMiddleware->getUserId();

    $password = SecurityHelper::sanitizeInput($input['password'] ?? '');
    $reason = isset($input['reason']) ? SecurityHelper::sanitizeInput($input['reason']) : null;

    if (empty($password)) {
        $auditService->logSecurityEvent($userId, 'account_deletion_attempt_no_password', []);
        JsonResponse::badRequest(['error' => 'Mot de passe requis']);
    }

    $result = $authService->deleteAccount($userId, $password, $reason);

    if ($result['success']) {
        JsonResponse::success($result);
    } else {
        JsonResponse::badRequest($result);
    }

} catch (Exception $e) {
    error_log("Account deletion error: " . $e->getMessage());
    JsonResponse::serverError(['error' => 'Erreur serveur']);
}