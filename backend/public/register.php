<?php
require_once __DIR__ . '/../bootstrap.php';

use App\Interfaces\DatabaseInterface;
use App\Middleware\InputSanitizerMiddleware;
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
    $db = $container->get(DatabaseInterface::class);
    $auditService = $container->get(AuditService::class);

    $sanitizedInput = [
        'username' => SecurityHelper::sanitizeInput($input['username'] ?? ''),
        'email' => SecurityHelper::sanitizeEmail($input['email'] ?? ''),
        'password' => $input['password'] ?? '',
        'password_confirm' => $input['password_confirm'] ?? ''
    ];

    if (empty($sanitizedInput['username']) || empty($sanitizedInput['email']) || empty($sanitizedInput['password'])) {
        JsonResponse::badRequest(['error' => 'Tous les champs sont requis']);
    }

    $result = $authService->register($sanitizedInput);

    if ($result['success']) {
        JsonResponse::created($result);
    } else {
        JsonResponse::badRequest($result);
    }

} catch (Exception $e) {
    error_log("Registration error: " . $e->getMessage());
    JsonResponse::serverError(['error' => 'Erreur serveur']);
}