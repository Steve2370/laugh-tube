<?php

require_once __DIR__ . '/../bootstrap.php';

use App\Interfaces\DatabaseInterface;
use App\Repositories\SessionRepository;
use App\Services\AuditService;
use App\Services\AuthService;
use App\Services\TwoFactorService;
use App\Utils\JsonResponse;
use App\Utils\SecurityHelper;

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    JsonResponse::methodNotAllowed(['error' => 'Méthode non autorisée']);
}

try {
    $container = require __DIR__ . '/../config/container.php';

    $db = $container->get(DatabaseInterface::class);
    $twoFactorService = $container->get(TwoFactorService::class);
    $authService = $container->get(AuthService::class);
    $sessionRepository = $container->get(SessionRepository::class);
    $auditService = $container->get(AuditService::class);

    $data = json_decode(file_get_contents('php://input'), true);
    $userId = (int)($data['user_id'] ?? 0);
    $code = SecurityHelper::sanitizeInput($data['code'] ?? '');

    if (empty($userId) || empty($code)) {
        JsonResponse::badRequest([
            'error' => 'Données manquantes',
            'message' => 'user_id et code requis'
        ]);
    }

    $result = $twoFactorService->verifyCode($userId, $code);

    if (!$result['success']) {
        $auditService->logSecurityEvent(
            $userId,
            '2fa_verification_failed',
            ['attempts' => $result['attempts'] ?? 0]
        );

        JsonResponse::unauthorized($result['code'] ?? 401);
    }

    $user = $db->fetchOne(
        "SELECT id, username, email, role FROM users WHERE id = $1 AND deleted_at IS NULL",
        [$userId]
    );

    if (!$user) {
        JsonResponse::notFound(['error' => 'Utilisateur introuvable']);
    }

    $ip = SecurityHelper::getClientIp();
    $userAgent = SecurityHelper::getUserAgent();

    $sessionId = $sessionRepository->createSession(
        $userId,
        $ip,
        $userAgent
    );

    $token = $authService->generateToken([
        'sub' => $userId,
        'username' => $user['username'],
        'email' => $user['email'],
        'role' => $user['role'],
        'session_id' => $sessionId,
        'two_fa_verified' => true
    ]);

    $auditService->logSecurityEvent(
        $userId,
        '2fa_verified',
        ['method' => $result['method'] ?? 'totp']
    );

    JsonResponse::success([
        'success' => true,
        'message' => 'Authentification 2FA réussie',
        'token' => $token,
        'user' => [
            'id' => $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'role' => $user['role']
        ]
    ]);

} catch (\Exception $e) {
    error_log("verify2faLogin - Error: " . $e->getMessage());
    JsonResponse::serverError(['error' => 'Erreur serveur']);
}