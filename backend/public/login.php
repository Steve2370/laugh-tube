<?php
require_once __DIR__ . '/../bootstrap.php';

use App\Interfaces\DatabaseInterface;
use App\Middleware\InputSanitizerMiddleware;
use App\Middleware\RateLimitMiddleware;
use App\Services\AuditService;
use App\Services\AuthService;
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

    $authService = $container->get(AuthService::class);
    $rateLimitMiddleware = $container->get(RateLimitMiddleware::class);
    $db = $container->get(DatabaseInterface::class);
    $auditService = $container->get(AuditService::class);

    $email = SecurityHelper::sanitizeEmail($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $twoFactorCode = isset($input['two_factor_code']) ? SecurityHelper::sanitizeInput($input['two_factor_code']) : null;

    if (empty($email) || empty($password)) {
        JsonResponse::badRequest(['error' => 'Email et mot de passe requis']);
    }

    if (!$rateLimitMiddleware->checkLoginAttempts($email)) {
        $auditService->logSecurityEvent(null, 'login_rate_limit_exceeded', [
            'email' => $email,
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'unknown'
        ]);
        JsonResponse::tooManyRequests(['error' => 'Trop de tentatives de connexion']);
    }

    $result = $authService->login($email, $password, $twoFactorCode);

    if ($result['success']) {
        JsonResponse::success($result);
    } else {
        JsonResponse::unauthorized($result);
    }

} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    JsonResponse::serverError(['error' => 'Erreur serveur']);
}