<?php
declare(strict_types=1);

error_reporting(E_ALL);
ini_set('display_errors', '1');

$dotenvPath = __DIR__ . '/../.env';
if (is_file($dotenvPath)) {
    $dotenv = parse_ini_file($dotenvPath, false, INI_SCANNER_RAW);
    if (is_array($dotenv)) {
        foreach ($dotenv as $key => $value) {
            $_ENV[(string)$key] = (string)$value;
        }
    }
}

require_once __DIR__ . '/../vendor/autoload.php';

require_once __DIR__ . '/../config/database.php';

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
use App\Services\AbonnementService;
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


header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=utf-8');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function normalizeUri(string $rawPath): string
{
    $path = $rawPath === '' ? '/' : $rawPath;

    if (str_starts_with($path, '/api/')) {
        $path = substr($path, 4);
        if ($path === '') {
            $path = '/';
        }
    }

    if ($path !== '/' && str_ends_with($path, '/')) {
        $path = rtrim($path, '/');
        if ($path === '') $path = '/';
    }

    return $path;
}

function isDev(): bool
{
    $env = $_ENV['APP_ENV'] ?? 'production';
    return $env === 'development' || $env === 'dev' || $env === 'local';
}

try {

    $container = require __DIR__ . '/../config/container.php';
    $db = $container->get(DatabaseInterface::class);

    $userModel = $container->get(User::class);
    $videoModel = $container->get(Video::class);
    $commentModel = $container->get(Commentaire::class);
    $reactionModel = $container->get(Reaction::class);
    $videoModel = new Video($db);
    $notificationModel = $container->get(Notification::class);
    $abonnementService = $container->get(AbonnementService::class);

    $tokenService = new TokenService();
    $validationService = new ValidationService();
    $uploadService = new UploadService();
    $videoStreamService = new VideoStreamService($db);
    $twoFactorService = $container->get(TwoFactorService::class);

    $authService = $container->get(AuthService::class);
    $authMiddleware = $container->get(AuthMiddleware::class);
    $auditService = $container->get(AuditService::class);
    $db = $container->get(DatabaseInterface::class);
    $videoService = $container->get(VideoService::class);
    $commentaireService = $container->get(CommentaireService::class);
    $userService = $container->get(UserService::class);
    $analyticsService = $container->get(AnalyticsService::class);
    $notificationService = $container->get(NotificationService::class);

    $reactionController = $container->get(ReactionController::class);

     $reactionService = new ReactionService($reactionModel, $videoModel);
     $reactionController = new ReactionController($reactionService, $authMiddleware, $auditService, $db);

    $authController = $container->get(AuthController::class);

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

    $userController = new UserController(
        $userService,
        $uploadService,
        $userModel,
        $abonnementService,
        $authMiddleware,
    );

    $notificationController = new NotificationController(
        $notificationService,
        $authMiddleware
    );

} catch (Throwable $e) {
    error_log('Initialization error: ' . $e->getMessage());
    if (isDev()) error_log($e->getTraceAsString());
    JsonResponse::serverError([
        'error' => 'Erreur d\'initialisation du serveur',
        'details' => isDev() ? $e->getMessage() : null,
    ]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$rawUri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?? '/';
$uri    = normalizeUri($rawUri);

error_log("API Call: $method $rawUri => normalized: $uri");

try {

    if ($uri === '/login' && $method === 'POST') {
        $authController->login(); return;
    }

    if ($uri === '/register' && $method === 'POST') {
        $authController->register();
        error_log("DEBUG index.php uri=" . ($_SERVER['REQUEST_URI'] ?? 'null') .
            " method=" . ($_SERVER['REQUEST_METHOD'] ?? 'null'));

        return;
    }

    if ($uri === '/auth/refresh' && $method === 'POST') {
        $authController->refresh(); return;
    }

    if ($uri === '/me' && $method === 'GET') {
        $authController->me(); return;
    }

    if ($uri === '/auth/change-password' && $method === 'POST') {
        $authController->changePassword(); return;
    }

    if ($uri === '/auth/logout' && $method === 'POST') {
        $authController->logout(); return;
    }

    if ($uri === '/verify2faLogin.php' && $method === 'POST') {
        $authController->verify2FALogin(); return;
    }

    if ($uri === '/auth/2fa/status' && $method === 'GET') {
        $authController->check2FAStatus(); return;
    }

    if ($uri === '/auth/2fa/enable' && $method === 'POST') {
        $authController->enable2FA(); return;
    }

    if ($uri === '/auth/2fa/verify' && $method === 'POST') {
        $authController->verify2FASetup(); return;
    }

    if ($uri === '/auth/2fa/disable' && $method === 'POST') {
        $authController->disable2FA(); return;
    }

    if ($uri === '/resetPasswordRequest.php' && $method === 'POST') {
        $authController->requestPasswordReset(); return;
    }

    if ($uri === '/resetPassword.php' && $method === 'POST') {
        $authController->resetPassword(); return;
    }

    if ($uri === '/resendVerification.php' && $method === 'POST') {
        $authController->resendVerification(); return;
    }

    if (($uri === '/users/me/avatar' || $uri === '/profile/upload-image') && $method === 'POST') {
        $userController->uploadAvatar();
        return;
    }

    if (($uri === '/users/me/cover' || $uri === '/profile/upload-cover') && $method === 'POST') {
        $userController->uploadCover();
        return;
    }

    if (($uri === '/profile' || $uri === '/users/profile/update') && $method === 'PUT') {
        $userController->updateProfile(); return;
    }

    if (($uri === '/users/me/bio' || $uri === '/users/me/bio') && $method === 'PUT') {
        $userController->updateBio(); return;
    }

    if (preg_match('#^/users/(\d+)/stats$#', $uri, $m) && $method === 'GET') {
        $userController->getStats((int)$m[1]); return;
    }

    if (preg_match('#^/users/(\d+)/profile$#', $uri, $m) && $method === 'GET') {
        $userController->getProfile((int)$m[1]); return;
    }

    if (preg_match('#^/users/(\d+)/profile-image$#', $uri, $m) && $method === 'GET') {
        $userController->getProfileImage((int)$m[1]); return;
    }

    if (preg_match('#^/users/(\d+)/watch-history$#', $uri, $m) && $method === 'GET') {
        $userController->getWatchHistory((int)$m[1]); return;
    }

    if (preg_match('#^/uploads/avatars/([^/]+)$#', $uri, $m) && $method === 'GET') {
        $userController->serveAvatar($m[1]); return;
    }

    if (preg_match('#^/uploads/profiles/([^/]+)$#', $uri, $m) && $method === 'GET') {
        $userController->serveProfile($m[1]);
        return;
    }

    if (preg_match('#^/users/(\d+)/subscribers-count$#', $uri, $m) && $method === 'GET') {
        header('Content-Type: application/json');
        http_response_code(200);
        echo json_encode(['success' => true, 'count' => 0, 'user_id' => (int)$m[1]]);
        return;
    }

    if (preg_match('#^/users/(\d+)/subscribe-status$#', $uri, $m) && $method === 'GET') {
        $user = AuthMiddleware::optionalAuth();
        $currentUserId = $user ? ($user['sub'] ?? null) : null;
        $userController->getSubscribeStatus((int)$m[1], $currentUserId); return;
    }

    if (preg_match('#^/users/(\d+)/subscribe$#', $uri, $m) && $method === 'POST') {
        $user = AuthMiddleware::requireAuth();
        $userController->subscribe((int)$m[1], $user['sub']); return;
    }

    if (preg_match('#^/users/(\d+)/unsubscribe$#', $uri, $m) && $method === 'DELETE') {
        $user = AuthMiddleware::requireAuth();
        $userController->unsubscribe((int)$m[1], $user['sub']); return;
    }

    if ($uri === '/videos/upload' && $method === 'POST') {
        $videoController->upload(); return;
    }

    elseif ($uri === '/videos' && $method === 'GET') {
        $videoService = $container->get(VideoService::class);
        $videoController = new VideoController($videoService, $analyticsService, $authMiddleware, $auditService, $db);
        $videoController->list();
        return;
    }


    if ($uri === '/videos/trending' && $method === 'GET') {
        $videoController->trending(); return;
    }

    if (preg_match('#^/videos/(\d+)$#', $uri, $m) && $method === 'GET') {
        $videoController->expose((int)$m[1]); return;
    }

    if (preg_match('#^/videos/(\d+)$#', $uri, $m) && $method === 'DELETE') {
        $videoController->delete((int)$m[1]); return;
    }

    if (preg_match('#^/users/(\d+)/videos$#', $uri, $m) && $method === 'GET') {
        $videoController->userVideos((int)$m[1]); return;
    }

    if (preg_match('#^/videos/(\d+)/play$#', $uri, $matches) && $method === 'GET') {
        $videoStreamService = new VideoStreamService($db);
        $videoStreamService->stream((int)$matches[1]);
        return;
    }

    if (preg_match('#^/videos/(\d+)/play$#', $uri, $matches) && $method === 'GET') {
        $videoStreamService = new VideoStreamService($db);
        $videoStreamService->serveThumbnail((int)$matches[1]);
        return;
    }

    if ($uri === '/videos/cleanup-sessions' && $method === 'POST') {
        $videoController->cleanupSessions(); return;
    }

    if (preg_match('#^/videos/(\d+)/views$#', $uri, $m) && $method === 'GET') {
        $videoController->getViews((int)$m[1]); return;
    }

    if (preg_match('#^/videos/(\d+)/viewed$#', $uri, $m) && $method === 'GET') {
        $videoController->checkViewed((int)$m[1]); return;
    }

    if (preg_match('#^/videos/(\d+)/record-view$#', $uri, $m) && $method === 'POST') {
        $videoController->recordView((int)$m[1]); return;
    }

    if (preg_match('#^/videos/(\d+)/analytics$#', $uri, $m) && $method === 'GET') {
        $videoController->getAnalytics((int)$m[1]); return;
    }

    if (preg_match('#^/videos/(\d+)/like$#', $uri, $m) && $method === 'POST') {
        $reactionController->like((int)$m[1]); return;
    }

    if (preg_match('#^/videos/(\d+)/dislike$#', $uri, $m) && $method === 'POST') {
        $reactionController->dislike((int)$m[1]); return;
    }
    if (preg_match('#^/videos/(\d+)/my-reaction$#', $uri, $m) && $method === 'GET') {
        $reactionController->status((int)$m[1]); return;
    }

    if (preg_match('#^/videos/(\d+)/reactions$#', $uri, $m) && $method === 'GET') {
        $reactionController->counts((int)$m[1]); return;
    }

    if (preg_match('#^/videos/(\d+)/comments$#', $uri, $m) && $method === 'GET') {
        $commentController->list((int)$m[1]); return;
    }
    if (preg_match('#^/videos/(\d+)/comments$#', $uri, $m) && $method === 'POST') {
        $commentController->create((int)$m[1]); return;
    }
    if (preg_match('#^/comments/(\d+)/replies$#', $uri, $m) && $method === 'POST') {
        $commentController->reply((int)$m[1]); return;
    }
    if (preg_match('#^/comments/(\d+)/replies$#', $uri, $m) && $method === 'GET') {
        $commentController->getReplies((int)$m[1]); return;
    }
    if (preg_match('#^/comments/(\d+)/like$#', $uri, $m) && $method === 'POST') {
        $commentController->likeComment((int)$m[1]); return;
    }
    if (preg_match('#^/comments/(\d+)/like-status$#', $uri, $m) && $method === 'GET') {
        $commentController->getLikeStatus((int)$m[1]); return;
    }
    if (preg_match('#^/replies/(\d+)/like$#', $uri, $m) && $method === 'POST') {
        $commentController->likeReply((int)$m[1]); return;
    }
    if (preg_match('#^/replies/(\d+)/like-status$#', $uri, $m) && $method === 'GET') {
        $commentController->getReplyLikeStatus((int)$m[1]); return;
    }

    if ($uri === '/notifications' && $method === 'GET') {
        if (!$authMiddleware->handle()) {
            http_response_code(401);
            echo json_encode(['success' => false, 'error' => 'Non authentifié']);
            return;
        }
        $notificationController->getNotifications($authMiddleware->getUserId());
        return;
    }


    if ($uri === '/notifications/unread-count' && $method === 'GET') {
        $user = AuthMiddleware::requireAuth();
        $notificationController->getUnreadCount($user['sub']); return;
    }

    if (preg_match('#^/notifications/(\d+)/read$#', $uri, $m) && $method === 'PUT') {
        $user = AuthMiddleware::requireAuth();
        $notificationController->markAsRead((int)$m[1], $user['sub']); return;
    }

    if ($uri === '/notifications/mark-all-read' && $method === 'PUT') {
        $user = AuthMiddleware::requireAuth();
        $notificationController->markAllAsRead($user['sub']); return;
    }

    if (preg_match('#^/notifications/(\d+)$#', $uri, $m) && $method === 'DELETE') {
        $user = AuthMiddleware::requireAuth();
        $notificationController->deleteNotification((int)$m[1], $user['sub']); return;
    }

    if (preg_match('#^/videos/(\d+)/view$#', $uri, $m) && $method === 'POST') {
        JsonResponse::gone([
            'error' => 'Méthode obsolète',
            'message' => 'Utilisez /videos/{id}/record-view à la place'
        ]);
        return;
    }

    if (preg_match('#^/videos/(\d+)/view-unique$#', $uri, $m) && $method === 'POST') {
        JsonResponse::gone([
            'error' => 'Méthode obsolète',
            'message' => 'Utilisez /videos/{id}/record-view à la place'
        ]);
        return;
    }

    if (preg_match('#^/videos/(\d+)/view-count$#', $uri, $m) && $method === 'GET') {
        JsonResponse::gone([
            'error' => 'Méthode obsolète',
            'message' => 'Utilisez /videos/{id}/views à la place'
        ]);
        return;
    }

    JsonResponse::notFound([
        'error' => 'Endpoint non trouvé',
        'method' => $method,
        'uri' => $uri,
        'raw' => $rawUri,
    ]);

} catch (Throwable $e) {
    error_log('Application error: ' . $e->getMessage());
    if (isDev()) error_log($e->getTraceAsString());

    JsonResponse::serverError([
        'error' => 'Erreur serveur',
        'message' => isDev() ? $e->getMessage() : 'Une erreur est survenue',
        'trace' => isDev() ? $e->getTraceAsString() : null,
    ]);
}
