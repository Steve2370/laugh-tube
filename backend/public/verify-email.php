<?php
require_once __DIR__ . '/../bootstrap.php';

use App\Interfaces\DatabaseInterface;
use App\Services\AuditService;
use App\Services\AuthService;
use App\Services\EmailService;
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
        $emailService = $container->get(EmailService::class);
        $user = $db->fetchOne(
            "SELECT id, username, email FROM users WHERE id = $1",
            [$result['userId']]
        );
        if ($user) {
            $emailService->sendWelcomeEmail((int)$user['id'], $user['email'], $user['username']);
        }

        header('Location: https://www.laughtube.ca/#/home?verified=1');
        exit;
    } else {
        header('Location: https://www.laughtube.ca/#/login?verify_error=1');
        exit;
    }

} catch (Exception $e) {
    error_log("Email verification error: " . $e->getMessage());
    JsonResponse::serverError(['error' => 'Erreur serveur']);
}