<?php
require_once __DIR__ . '/../bootstrap.php';

use App\Interfaces\DatabaseInterface;
use App\Services\AuditService;
use App\Services\AuthService;
use App\Utils\JsonResponse;
use App\Utils\SecurityHelper;

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    JsonResponse::methodNotAllowed(['error' => 'Méthode non autorisée']);
}

try {
    $container = require __DIR__ . '/../config/container.php';

    $authService = $container->get(AuthService::class);
    $db = $container->get(DatabaseInterface::class);
    $auditService = $container->get(AuditService::class);

    $token = trim($_GET['token'] ?? '');

    if ($token === '' || !preg_match('/^[a-f0-9]{64}$/i', $token)) {
        JsonResponse::badRequest(['error' => 'Token invalide']);
    }

    $result = $authService->verifyEmail($token);

    if ($result['success']) {
        JsonResponse::success($result);
    } else {
        JsonResponse::badRequest($result);
    }

} catch (Exception $e) {
    error_log("Email verification error: " . $e->getMessage());
    JsonResponse::serverError(['error' => 'Erreur serveur']);
}