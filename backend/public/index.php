<?php

$dotenv = parse_ini_file(__DIR__ . '/../.env');
foreach ($dotenv as $key => $value) {
    $_ENV[$key] = $value;
}
require_once __DIR__ . '/../vendor/autoload.php';

use App\Controllers\AuthController;
use App\Controllers\CommentaireController;
use App\Controllers\NotificationController;
use App\Controllers\ReactionController;
use App\Controllers\UserController;
use App\Controllers\VideoController;
use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthMiddleware;
use App\Models\Commentaire;
use App\Models\Notification;
use App\Models\Reaction;
use App\Models\User;
use App\Models\Video;
use App\Models\VideoView;
use App\Services\AnalyticsService;
use App\Services\AuditService;
use App\Services\AuthService;
use App\Services\CommentaireService;
use App\Services\NotificationService;
use App\Services\ReactionService;
use App\Services\TokenService;
use App\Services\TwoFactorService;
use App\Services\UploadService;
use App\Services\UserService;
use App\Services\ValidationService;
use App\Services\VideoService;
use App\Services\VideoStreamService;
use App\Utils\JsonResponse;

require_once __DIR__ . '/../config/database.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $container = require_once __DIR__ . '/../config/container.php';

    $userModel = $container->get(User::class);
    $videoModel = $container->get(Video::class);
    $commentModel = $container->get(Commentaire::class);
    $reactionModel = $container->get(Reaction::class);
    $videoViewModel = $container->get(VideoView::class);
    $notificationModel = $container->get(Notification::class);

    $tokenService = new TokenService();
    $validationService = new ValidationService();
    $fileUploadService = new UploadService();
    $videoStreamService = new VideoStreamService();
    $twoFactorService = $container->get(TwoFactorService::class);

    $authService = $container->get(AuthService::class);
    $authMiddleware = $container->get(AuthMiddleware::class);
    $auditService = $container->get(AuditService::class);
    $db = $container->get(DatabaseInterface::class);
    $videoService = $container->get(VideoService::class);
    $reactionService = new ReactionService($reactionModel, $videoModel);
    $commentaireService = $container->get(CommentaireService::class);
    $userService = $container->get(UserService::class);
    $analyticsService = $container->get(AnalyticsService::class);
    $notificationService = $container->get(NotificationService::class);

    $authController = $container->get(AuthController::class);
    $videoController = new VideoController(
        $videoService,
        $analyticsService,
        $authMiddleware,
        $auditService,
        $db
    );

    $reactionController = $container->get(ReactionController::class);
    $commentController = new CommentaireController(
        $commentaireService,
        $authMiddleware,
        $auditService,
        $db
    );
    $userController = new UserController($userService, $fileUploadService, $userModel);
    $notificationController = new NotificationController(
        $notificationService,
        $authMiddleware
    );

} catch (Throwable $e) {
    error_log('Initialization error: ' . $e->getMessage());
    JsonResponse::serverError(['error' => 'Erreur d\'initialisation du serveur']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

error_log("API Call: $method $uri");

try {

    if ($uri === '/login' && $method === 'POST') {
        $authController->login();
    }

    elseif ($uri === '/register' && $method === 'POST') {
        $authController->register();
    }

    elseif ($uri === '/api/auth/refresh' && $method === 'POST') {
        $authController->refresh();
    }

    elseif ($uri === '/me' && $method === 'GET') {
        $authController->me();
    }

    elseif ($uri === '/api/auth/change-password' && $method === 'POST') {
        $authController->changePassword();
    }

    elseif ($uri === '/api/auth/logout' && $method === 'POST') {
        $authController->logout();
    }

    elseif ($uri === '/verify2faLogin.php' && $method === 'POST') {
        $authController->verify2FALogin();
    }

    elseif ($uri === '/api/auth/2fa/status' && $method === 'GET') {
        $authController->check2FAStatus();
    }

    elseif ($uri === '/api/auth/2fa/enable' && $method === 'POST') {
        $authController->enable2FA();
    }

    elseif ($uri === '/api/auth/2fa/verify' && $method === 'POST') {
        $authController->verify2FASetup();
    }

    elseif ($uri === '/api/auth/2fa/disable' && $method === 'POST') {
        $authController->disable2FA();
    }

    elseif ($uri === '/resetPasswordRequest.php' && $method === 'POST') {
        $authController->requestPasswordReset();
    }

    elseif ($uri === '/resetPassword.php' && $method === 'POST') {
        $authController->resetPassword();
    }

    elseif ($uri === '/resendVerification.php' && $method === 'POST') {
        $authController->resendVerification();
    }

    elseif (($uri === '/api/users/me/avatar' || $uri === '/profile/upload-image') && $method === 'POST') {
        $userController->uploadAvatar();
    }

    elseif (($uri === '/api/users/me/cover' || $uri === '/profile/upload-cover') && $method === 'POST') {
        $userController->uploadCover();
    }

    elseif (($uri === '/profile' || $uri === '/users/profile/update') && $method === 'PUT') {
        $userController->updateProfile();
    }

    elseif (($uri === '/users/me/bio' || $uri === '/api/users/me/bio') && $method === 'PUT') {
        $userController->updateBio();
    }

    elseif (preg_match('#^/users/(\d+)/stats$#', $uri, $matches) && $method === 'GET') {
        $userController->getStats((int)$matches[1]);
    }

    elseif (preg_match('#^/users/(\d+)/profile$#', $uri, $matches) && $method === 'GET') {
        $userController->getProfile((int)$matches[1]);
    }

    elseif (preg_match('#^/users/(\d+)/profile-image$#', $uri, $matches) && $method === 'GET') {
        $userController->getProfileImage((int)$matches[1]);
    }

    elseif (preg_match('#^/users/(\d+)/watch-history$#', $uri, $matches) && $method === 'GET') {
        $userController->getWatchHistory((int)$matches[1]);
    }

    elseif (preg_match('#^/uploads/avatars/([^/]+)$#', $uri, $matches) && $method === 'GET') {
        $userController->serveAvatar($matches[1]);
    }

    elseif (preg_match('#^/users/(\d+)/subscribers-count$#', $uri, $matches) && $method === 'GET') {
        $userController->getSubscribersCount((int)$matches[1]);
    }

    elseif (preg_match('#^/users/(\d+)/subscribe-status$#', $uri, $matches) && $method === 'GET') {
        $user = AuthMiddleware::optionalAuth();
        $userId = $user ? $user['sub'] : null;
        $userController->getSubscribeStatus((int)$matches[1], $userId);
    }

    elseif (preg_match('#^/users/(\d+)/subscribe$#', $uri, $matches) && $method === 'POST') {
        $user = AuthMiddleware::requireAuth();
        $userController->subscribe((int)$matches[1], $user['sub']);
    }

    elseif (preg_match('#^/users/(\d+)/unsubscribe$#', $uri, $matches) && $method === 'DELETE') {
        $user = AuthMiddleware::requireAuth();
        $userController->unsubscribe((int)$matches[1], $user['sub']);
    }

    elseif ($uri === '/videos/upload' && $method === 'POST') {
        $videoController->upload();
    }

    elseif ($uri === '/videos' && $method === 'GET') {
        $videoController->list();
    }

    elseif ($uri === '/videos/trending' && $method === 'GET') {
        $videoController->trending();
    }

    elseif (preg_match('#^/videos/(\d+)$#', $uri, $matches) && $method === 'GET') {
        $videoController->expose((int)$matches[1]);
    }

    elseif (preg_match('#^/videos/(\d+)$#', $uri, $matches) && $method === 'DELETE') {
        $videoController->delete((int)$matches[1]);
    }

    elseif (preg_match('#^/users/(\d+)/videos$#', $uri, $matches) && $method === 'GET') {
        $videoController->userVideos((int)$matches[1]);
    }

    elseif (preg_match('#^/videos/(\d+)/play$#', $uri, $matches) && $method === 'GET') {
        $videoStreamService->stream((int)$matches[1]);
    }

    elseif (preg_match('#^/videos/(\d+)/thumbnail$#', $uri, $matches) && $method === 'GET') {
        $videoStreamService->serveThumbnail((int)$matches[1]);
    }

    elseif ($uri === '/videos/cleanup-sessions' && $method === 'POST') {
        $videoController->cleanupSessions();
    }

    elseif (preg_match('#^/videos/(\d+)/views$#', $uri, $matches) && $method === 'GET') {
        $videoController->getViews((int)$matches[1]);
    }

    elseif (preg_match('#^/videos/(\d+)/viewed$#', $uri, $matches) && $method === 'GET') {
        $videoController->checkViewed((int)$matches[1]);
    }

    elseif (preg_match('#^/videos/(\d+)/record-view$#', $uri, $matches) && $method === 'POST') {
        $videoController->recordView((int)$matches[1]);
    }

    elseif (preg_match('#^/videos/(\d+)/analytics$#', $uri, $matches) && $method === 'GET') {
        $videoController->getAnalytics((int)$matches[1]);
    }

    elseif (preg_match('#^/videos/(\d+)/like$#', $uri, $matches) && $method === 'POST') {
        $reactionController->like((int)$matches[1]);
    }

    elseif (preg_match('#^/videos/(\d+)/dislike$#', $uri, $matches) && $method === 'POST') {
        $reactionController->dislike((int)$matches[1]);
    }

    elseif (preg_match('#^/videos/(\d+)/my-reaction$#', $uri, $matches) && $method === 'GET') {
        $reactionController->status((int)$matches[1]);
    }

    elseif (preg_match('#^/videos/(\d+)/reactions$#', $uri, $matches) && $method === 'GET') {
        $reactionController->counts((int)$matches[1]);
    }

    elseif (preg_match('#^/videos/(\d+)/comments$#', $uri, $matches) && $method === 'GET') {
        $commentController->list((int)$matches[1]);
    }

    elseif (preg_match('#^/videos/(\d+)/comments$#', $uri, $matches) && $method === 'POST') {
        $commentController->create((int)$matches[1]);
    }

    elseif (preg_match('#^/comments/(\d+)/replies$#', $uri, $matches) && $method === 'POST') {
        $commentController->reply((int)$matches[1]);
    }

    elseif (preg_match('#^/comments/(\d+)/replies$#', $uri, $matches) && $method === 'GET') {
        $commentController->getReplies((int)$matches[1]);
    }

    elseif (preg_match('#^/comments/(\d+)/like$#', $uri, $matches) && $method === 'POST') {
        $commentController->likeComment((int)$matches[1]);
    }

    elseif (preg_match('#^/comments/(\d+)/like-status$#', $uri, $matches) && $method === 'GET') {
        $commentController->getLikeStatus((int)$matches[1]);
    }

    elseif (preg_match('#^/replies/(\d+)/like$#', $uri, $matches) && $method === 'POST') {
        $commentController->likeReply((int)$matches[1]);
    }

    elseif (preg_match('#^/replies/(\d+)/like-status$#', $uri, $matches) && $method === 'GET') {
        $commentController->getReplyLikeStatus((int)$matches[1]);
    }

    elseif ($uri === '/notifications' && $method === 'GET') {
        $user = AuthMiddleware::requireAuth();
        $notificationController->getNotifications($user['sub']);
    }

    elseif ($uri === '/notifications/unread-count' && $method === 'GET') {
        $user = AuthMiddleware::requireAuth();
        $notificationController->getUnreadCount($user['sub']);
    }

    elseif (preg_match('#^/notifications/(\d+)/read$#', $uri, $matches) && $method === 'PUT') {
        $user = AuthMiddleware::requireAuth();
        $notificationController->markAsRead((int)$matches[1], $user['sub']);
    }

    elseif ($uri === '/notifications/mark-all-read' && $method === 'PUT') {
        $user = AuthMiddleware::requireAuth();
        $notificationController->markAllAsRead($user['sub']);
    }

    elseif (preg_match('#^/notifications/(\d+)$#', $uri, $matches) && $method === 'DELETE') {
        $user = AuthMiddleware::requireAuth();
        $notificationController->deleteNotification((int)$matches[1], $user['sub']);
    }

    elseif (preg_match('#^/videos/(\d+)/view$#', $uri, $matches) && $method === 'POST') {
        JsonResponse::gone([
            'error' => 'Méthode obsolète',
            'message' => 'Utilisez /videos/{id}/record-view à la place'
        ]);
    }

    elseif (preg_match('#^/videos/(\d+)/view-unique$#', $uri, $matches) && $method === 'POST') {
        JsonResponse::gone([
            'error' => 'Méthode obsolète',
            'message' => 'Utilisez /videos/{id}/record-view à la place'
        ]);
    }

    elseif (preg_match('#^/videos/(\d+)/view-count$#', $uri, $matches) && $method === 'GET') {
        JsonResponse::gone([
            'error' => 'Méthode obsolète',
            'message' => 'Utilisez /videos/{id}/views à la place'
        ]);
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
        'message' => ($_ENV['APP_ENV'] ?? 'production') === 'development' ? $e->getMessage() : 'Une erreur est survenue',
        'trace' => ($_ENV['APP_ENV'] ?? 'production') === 'development' ? $e->getTraceAsString() : null
    ]);
}
