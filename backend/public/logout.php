<?php
require_once __DIR__ . '/../bootstrap.php';

use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthMiddleware;
use App\Services\AuditService;
use App\Services\AuthService;
use App\Utils\JsonResponse;

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    JsonResponse::methodNotAllowed(['error' => 'Méthode non autorisée']);
}

try {
    $container = require __DIR__ . '/../config/container.php';

    $authMiddleware = $container->get(AuthMiddleware::class);
    $authService = $container->get(AuthService::class);
    $db = $container->get(DatabaseInterface::class);
    $auditService = $container->get(AuditService::class);

    if (!$authMiddleware->handle()) {
        JsonResponse::unauthorized(['error' => 'Non authentifié']);
    }

    $userId = $authMiddleware->getUserId();
    $token = $authMiddleware->getToken();

    if (empty($token)) {
        JsonResponse::badRequest(['error' => 'Token manquant']);
    }

    $result = $authService->logout($token);

    if ($result['success']) {
        JsonResponse::success($result);
    } else {
        JsonResponse::badRequest($result);
    }

} catch (Exception $e) {
    error_log("Logout error: " . $e->getMessage());
    JsonResponse::serverError(['error' => 'Erreur serveur']);
}