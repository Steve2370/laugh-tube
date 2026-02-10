<?php

error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../bootstrap.php';

use App\Controllers\AuthController;
use App\Controllers\VideoController;
use App\Controllers\CommentaireController;
use App\Controllers\NotificationController;
use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthMiddleware;
use App\Services\AnalyticsService;
use App\Services\AuditService;
use App\Services\CommentaireService;
use App\Services\NotificationService;
use App\Services\VideoService;
use App\Utils\JsonResponse;

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $container = require __DIR__ . '/../config/container.php';

    $authMiddleware = $container->get(AuthMiddleware::class);
    $videoService = $container->get(VideoService::class);
    $analyticsService = $container->get(AnalyticsService::class);
    $auditService = $container->get(AuditService::class);
    $authController = $container->get(AuthController::class);
    $commentaireService = $container->get(CommentaireService::class);
    $notificationService = $container->get(NotificationService::class);
    $db = $container->get(DatabaseInterface::class);

    $videoController = new VideoController(
        $videoService,
        $analyticsService,
        $authMiddleware,
        $auditService,
        $db
    );

    $commentController = new CommentaireController(
        $commentaireService,
        $authMiddleware,
        $auditService,
        $db
    );

    $notificationController = new NotificationController(
        $notificationService,
        $authMiddleware
    );

} catch (Throwable $e) {
    error_log('Initialization error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());
    JsonResponse::serverError([
        'error' => 'Erreur d\'initialisation du serveur',
        'details' => $e->getMessage()
    ]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? '/';

if (str_starts_with($uri, '/api/')) {
    $uri = substr($uri, 4);
    if ($uri === '') {
        $uri = '/';
    }
}

error_log("API Call: $method $uri");

try {
    if ($uri === '/videos' && $method === 'GET') {
        $videoController->list();
    }
    elseif ($uri === '/videos/trending' && $method === 'GET') {
        $videoController->trending();
    }
    elseif (preg_match('#^/videos/(\d+)$#', $uri, $matches) && $method === 'GET') {
        $videoController->getVideo((int)$matches[1]);
    }

    if ($uri === '/login' && $method === 'POST') {
        $authController->login();
    }

    elseif ($uri === '/register' && $method === 'POST') {
        $authController->register();
    }

    elseif (preg_match('#^/videos/(\d+)/comments$#', $uri, $matches) && $method === 'GET') {
        $commentController->list((int)$matches[1]);
    }

    elseif (preg_match('#^/videos/(\d+)/comments$#', $uri, $matches) && $method === 'POST') {
        $commentController->create((int)$matches[1]);
    }
    elseif ($uri === '/notifications' && $method === 'GET') {
        $notificationController->list();
    }
    else {
        JsonResponse::notFound([
            'error' => 'Endpoint non trouvé',
            'method' => $method,
            'uri' => $uri
        ]);
    }

} catch (Throwable $e) {
    error_log('Application error: ' . $e->getMessage());
    error_log('Stack trace: ' . $e->getTraceAsString());

    JsonResponse::serverError([
        'error' => 'Erreur serveur',
        'details' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}