<?php
require_once __DIR__ . '/../bootstrap.php';

use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthMiddleware;
use App\Services\AuditService;
use App\Utils\JsonResponse;


header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    JsonResponse::badRequest(['error' => 'Méthode non autorisée']);
}

try {
    $container = require __DIR__ . '/../config/container.php';

    $authMiddleware = $container->get(AuthMiddleware::class);
    $db = $container->get(DatabaseInterface::class);
    $auditService = $container->get(AuditService::class);

    if (!$authMiddleware->handle()) {
        JsonResponse::unauthorized(['error' => 'Non authentifié']);
    }

    $userId = $authMiddleware->getUserId();

    $user = $db->fetchOne(
        "SELECT id, username, deletion_scheduled_at FROM users WHERE id = $1",
        [$userId]
    );

    if (!$user || empty($user['deletion_scheduled_at'])) {
        JsonResponse::badRequest([
            'error' => 'Aucune suppression en attente'
        ]);
    }

    $db->execute(
        "UPDATE users SET deletion_scheduled_at = NULL, deleted_at = NULL, updated_at = NOW() WHERE id = $1",
        [$userId]
    );

    $auditService->logSecurityEvent($userId, 'account_deletion_cancelled', []);

    JsonResponse::success([
        'success' => true,
        'message' => 'Suppression du compte annulée'
    ]);

} catch (\Exception $e) {
    error_log("cancelDeletion - Error: " . $e->getMessage());
    JsonResponse::serverError(['error' => 'Erreur serveur']);
}