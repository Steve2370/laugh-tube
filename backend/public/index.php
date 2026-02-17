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

use App\Controllers\AbonnementController;
use App\Controllers\AuthController;
use App\Controllers\CommentaireController;
use App\Controllers\NotificationController;
use App\Controllers\ReactionController;
use App\Controllers\UserController;
use App\Controllers\VideoController;
use App\Interfaces\DatabaseInterface;
use App\Interfaces\EmailProviderInterface;
use App\Middleware\AuthMiddleware;
use App\Models\Abonnement;
use App\Models\Commentaire;
use App\Models\Notification;
use App\Models\Reaction;
use App\Models\User;
use App\Models\Video;
use App\Models\VideoView;
use App\Providers\PostgreSQLDatabase;
use App\Repositories\LogRepository;
use App\Repositories\SessionRepository;
use App\Repositories\UserRepository;
use App\Services\AbonnementService;
use App\Services\AnalyticsService;
use App\Services\AuditService;
use App\Services\AuthService;
use App\Services\CommentaireService;
use App\Services\EmailService;
use App\Services\NotificationCreationService;
use App\Services\NotificationService;
use App\Services\ReactionService;
use App\Services\ResendEmailProvider;
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
        if ($path === '') $path = '/';
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
    $dbConfig = require __DIR__ . '/../config/database.php';
    $db = new PostgreSQLDatabase($dbConfig);
    $db->connect();

    $userModel = new User($db);
    $videoModel = new Video($db);
    $commentModel = new Commentaire($db);
    $reactionModel = new Reaction($db);
    $notificationModel = new Notification($db);
    $abonnementModel = new Abonnement($db);
    $videoViewModel = new VideoView($db);

    $userRepository = new UserRepository($db);
    $sessionRepository = new SessionRepository($db);
    $logRepository = new LogRepository($db);

    $tokenService = new TokenService();
    $validationService = new ValidationService();
    $uploadService = new UploadService();
    $auditService = new AuditService($logRepository, $db);

    $emailConfig = require __DIR__ . '/../config/email.php';
    $emailProvider = new ResendEmailProvider($emailConfig);
    $emailService = new EmailService($logRepository, $emailProvider, $emailConfig['base_url']);

    $notificationCreationService = new NotificationCreationService($db, $userModel);
    $notificationService = new NotificationService($notificationModel, $userModel);

    $userService = new UserService(
        $userModel,
        $videoModel,
        $videoViewModel,
        $db,
        $validationService,
        $auditService,
        $notificationCreationService,
        $uploadService
    );

    $videoService = new VideoService(
        $videoModel,
        $commentModel,
        $reactionModel,
        $db,
        $validationService,
        $auditService,
        $notificationCreationService,
        $uploadService
    );

    $commentaireService = new CommentaireService(
        $commentModel,
        $videoModel,
        $userModel,
        $db,
        $notificationCreationService
    );

    $reactionService = new ReactionService(
        $reactionModel,
        $videoModel,
        $notificationService
    );

    $abonnementService = new AbonnementService(
        $abonnementModel,
        $userModel,
        $notificationCreationService
    );

    $analyticsService = new AnalyticsService($db);

    $authService = new AuthService(
        $userRepository,
        $logRepository,
        $tokenService,
        $validationService,
        $sessionRepository,
        $emailService,
        $auditService
    );

    $twoFactorService = new TwoFactorService($userModel, $db, $auditService);
    $videoStreamService = new VideoStreamService($db);

    $authMiddleware = new AuthMiddleware($tokenService, $sessionRepository, $db, $auditService);

    $authController = new AuthController($authService, $validationService, $auditService, $authMiddleware);

    $userController = new UserController(
        $userService,
        $uploadService,
        $userModel,
        $abonnementService,
        $authMiddleware
    );

    $videoController = new VideoController(
        $videoService,
        $videoModel,
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

    $reactionController = new ReactionController(
        $reactionService,
        $authMiddleware,
        $auditService
    );

    $notificationController = new NotificationController(
        $notificationService,
        $authMiddleware
    );

    $abonnementController = new AbonnementController(
        $abonnementService,
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
$uri = normalizeUri($rawUri);

error_log("API Call: $method $rawUri => normalized: $uri");

try {

    if ($uri === '/login' && $method === 'POST') {
        $authController->login();
        return;
    }

    if ($uri === '/register' && $method === 'POST') {
        $authController->register();
        return;
    }

    if ($uri === '/auth/refresh' && $method === 'POST') {
        $authController->refresh();
        return;
    }

    if ($uri === '/me' && $method === 'GET') {
        $authController->me();
        return;
    }

    if ($uri === '/auth/change-password' && $method === 'POST') {
        $authController->changePassword();
        return;
    }

    if ($uri === '/auth/logout' && $method === 'POST') {
        $authController->logout();
        return;
    }

    if ($uri === '/verify2faLogin.php' && $method === 'POST') {
        $authController->verify2FALogin();
        return;
    }

    if ($uri === '/auth/2fa/status' && $method === 'GET') {
        $authController->check2FAStatus();
        return;
    }

    if ($uri === '/auth/2fa/enable' && $method === 'POST') {
        $authController->enable2FA();
        return;
    }

    if ($uri === '/auth/2fa/disable' && $method === 'POST') {
        $authController->disable2FA();
        return;
    }

    if ($uri === '/auth/2fa/verify' && $method === 'POST') {
        $authController->verify2FA();
        return;
    }

    if ($uri === '/resetPasswordRequest.php' && $method === 'POST') {
        $authController->requestPasswordReset();
        return;
    }

    if ($uri === '/resetPassword.php' && $method === 'POST') {
        $authController->resetPassword();
        return;
    }

    if ($uri === '/resendVerification.php' && $method === 'POST') {
        $authController->resendVerification();
        return;
    }

    if (($uri === '/users/me/avatar' || $uri === '/profile/upload-avatar') && $method === 'POST') {
        $userController->uploadAvatar();
        return;
    }

    if (($uri === '/users/me/cover' || $uri === '/profile/upload-cover') && $method === 'POST') {
        $userController->uploadCover();
        return;
    }

    if (($uri === '/profile' || $uri === '/users/profile/update') && $method === 'PUT') {
        $userController->updateProfile();
        return;
    }

    if ($uri === '/users/me/bio' && $method === 'PUT') {
        $userController->updateBio();
        return;
    }

    if (preg_match('#^/users/(\d+)/stats$#', $uri, $m) && $method === 'GET') {
        $userController->getStats((int)$m[1]);
        return;
    }

    if (preg_match('#^/users/(\d+)/profile$#', $uri, $m) && $method === 'GET') {
        $userController->getProfile((int)$m[1]);
        return;
    }

    if (preg_match('#^/users/(\d+)/profile-image$#', $uri, $m) && ($method === 'GET' || $method === 'HEAD')) {
        $userController->getProfileImage((int)$m[1]);
        return;
    }

    if (preg_match('#^/users/(\d+)/cover-image$#', $uri, $m) && ($method === 'GET' || $method === 'HEAD')) {
        $userController->getCoverImage((int)$m[1]);
        return;
    }

    if (preg_match('#^/users/(\d+)/watch-history$#', $uri, $m) && $method === 'GET') {
        $userController->getWatchHistory((int)$m[1]);
        return;
    }

    if (preg_match('#^/uploads/avatars/([^/]+)$#', $uri, $m) && $method === 'GET') {
        $userController->serveAvatar($m[1]);
        return;
    }

    if (preg_match('#^/uploads/profiles/([^/]+)$#', $uri, $m) && $method === 'GET') {
        $userController->serveProfile($m[1]);
        return;
    }

    if (preg_match('#^/uploads/covers/([^/]+)$#', $uri, $m) && $method === 'GET') {
        $userController->serveCover($m[1]);
        return;
    }

    if (preg_match('#^/users/(\d+)/subscribers-count$#', $uri, $m) && $method === 'GET') {
        $userController->getSubscribersCount((int)$m[1]);
        return;
    }

    if (preg_match('#^/users/(\d+)/subscribe-status$#', $uri, $m) && $method === 'GET') {
        $user = AuthMiddleware::optionalAuth();
        $currentUserId = $user['sub'] ?? null;
        $currentUserId = $currentUserId ? (int)$currentUserId : null;
        $abonnementController->getStatus((int)$m[1], $currentUserId);
        return;
    }


    if (preg_match('#^/users/(\d+)/subscribe$#', $uri, $m) && $method === 'POST') {
        $user = AuthMiddleware::requireAuth();
        if (!$user || !isset($user['sub'])) return;
        $abonnementController->subscribe((int)$m[1]);
        return;
    }

    if (preg_match('#^/users/(\d+)/unsubscribe$#', $uri, $m) && $method === 'DELETE') {
        $user = AuthMiddleware::requireAuth();
        if (!$user || !isset($user['sub'])) return;
        $abonnementController->unsubscribe((int)$m[1]);
        return;
    }

    if ($uri === '/videos/upload' && $method === 'POST') {
        $videoController->upload();
        return;
    }

    if ($uri === '/videos' && $method === 'GET') {
        $videoController->list();
        return;
    }

    if ($uri === '/videos/trending' && $method === 'GET') {
        $videoController->trending();
        return;
    }

    if (preg_match('#^/videos/(\d+)$#', $uri, $m) && $method === 'GET') {
        $videoController->expose((int)$m[1]);
        return;
    }

    if (preg_match('#^/videos/(\d+)$#', $uri, $m) && $method === 'DELETE') {
        $videoController->delete((int)$m[1]);
        return;
    }

    if (preg_match('#^/users/(\d+)/videos$#', $uri, $m) && $method === 'GET') {
        $videoController->userVideos((int)$m[1]);
        return;
    }

    if (preg_match('#^/videos/(\d+)/thumbnail$#', $uri, $m) && ($method === 'GET' || $method === 'HEAD')) {
        $videoController->getThumbnail((int)$m[1]);
        return;
    }

    if (preg_match('#^/videos/(\d+)/play$#', $uri, $m) && $method === 'GET') {
        $videoStreamService->stream((int)$m[1]);
        return;
    }

    if ($uri === '/videos/cleanup-sessions' && $method === 'POST') {
        $videoController->cleanupSessions();
        return;
    }

    if (preg_match('#^/videos/(\d+)/views$#', $uri, $m) && $method === 'GET') {
        $videoController->getViews((int)$m[1]);
        return;
    }

    if (preg_match('#^/videos/(\d+)/viewed$#', $uri, $m) && $method === 'GET') {
        $videoController->checkViewed((int)$m[1]);
        return;
    }

    if (preg_match('#^/videos/(\d+)/record-view$#', $uri, $m) && $method === 'POST') {
        $videoController->recordView((int)$m[1]);
        return;
    }

    if (preg_match('#^/videos/(\d+)/view$#', $uri, $m) && $method === 'POST') {
        $videoController->incrementView((int)$m[1]);
        return;
    }

    if (preg_match('#^/videos/(\d+)/analytics$#', $uri, $m) && $method === 'GET') {
        $videoController->getAnalytics((int)$m[1]);
        return;
    }

    if (preg_match('#^/videos/(\d+)/like$#', $uri, $m) && $method === 'POST') {
        $reactionController->like((int)$m[1]);
        return;
    }

    if (preg_match('#^/videos/(\d+)/dislike$#', $uri, $m) && $method === 'POST') {
        $reactionController->dislike((int)$m[1]);
        return;
    }

    if (preg_match('#^/videos/(\d+)/my-reaction$#', $uri, $m) && $method === 'GET') {
        $reactionController->status((int)$m[1]);
        return;
    }

    if (preg_match('#^/videos/(\d+)/reactions$#', $uri, $m) && $method === 'GET') {
        $reactionController->counts((int)$m[1]);
        return;
    }

    if (preg_match('#^/videos/(\d+)/comments$#', $uri, $m) && $method === 'GET') {
        $commentController->list((int)$m[1]);
        return;
    }

    if (preg_match('#^/videos/(\d+)/comments$#', $uri, $m) && $method === 'POST') {
        $commentController->create((int)$m[1]);
        return;
    }

    if (preg_match('#^/comments/(\d+)/replies$#', $uri, $m) && $method === 'POST') {
        $commentController->reply((int)$m[1]);
        return;
    }

    if (preg_match('#^/comments/(\d+)/replies$#', $uri, $m) && $method === 'GET') {
        $commentController->getReplies((int)$m[1]);
        return;
    }

    if (preg_match('#^/comments/(\d+)/like$#', $uri, $m) && $method === 'POST') {
        $commentController->likeComment((int)$m[1]);
        return;
    }

    if (preg_match('#^/comments/(\d+)/like-status$#', $uri, $m) && $method === 'GET') {
        $commentController->getLikeStatus((int)$m[1]);
        return;
    }

    if (preg_match('#^/replies/(\d+)/like$#', $uri, $m) && $method === 'POST') {
        $commentController->likeReply((int)$m[1]);
        return;
    }

    if (preg_match('#^/replies/(\d+)/like-status$#', $uri, $m) && $method === 'GET') {
        $commentController->getReplyLikeStatus((int)$m[1]);
        return;
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
        $notificationController->getUnreadCount($user['sub']);
        return;
    }

    if (preg_match('#^/notifications/(\d+)/read$#', $uri, $m) && $method === 'PUT') {
        $user = AuthMiddleware::requireAuth();
        $notificationController->markAsRead((int)$m[1], $user['sub']);
        return;
    }

    if ($uri === '/notifications/mark-all-read' && $method === 'PUT') {
        $user = AuthMiddleware::requireAuth();
        $notificationController->markAllAsRead($user['sub']);
        return;
    }

    if (preg_match('#^/notifications/(\d+)$#', $uri, $m) && $method === 'DELETE') {
        $user = AuthMiddleware::requireAuth();
        $notificationController->deleteNotification((int)$m[1], $user['sub']);
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