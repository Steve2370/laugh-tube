<?php

use App\Controllers\AuthController;
use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthMiddleware;
use App\Models\Abonnement;
use App\Models\Commentaire;
use App\Models\Notification;
use App\Models\Reaction;
use App\Models\User;
use App\Models\Video;
use App\Providers\PostgreSQLDatabase;
use App\Repositories\LogRepository;
use App\Repositories\SessionRepository;
use App\Repositories\UserRepository;
use App\Services\AbonnementService;
use App\Services\AnalyticsService;
use App\Services\AuditService;
use App\Services\AuthService;
use App\Services\CommentaireService;
use App\Services\NotificationCreationService;
use App\Services\NotificationService;
use App\Services\ReactionService;
use App\Services\TokenService;
use App\Services\TwoFactorService;
use App\Services\UploadService;
use App\Services\UserService;
use App\Services\ValidationService;
use App\Services\VideoService;

$container = new class {
    private array $services = [];

    public function set(string $id, callable $factory): void {
        $this->services[$id] = $factory;
    }

    public function get(string $id) {
        if (!isset($this->services[$id])) {
            throw new Exception("Service {$id} not found in container");
        }

        $factory = $this->services[$id];
        return $factory($this);
    }
};

$container->set(DatabaseInterface::class, function() {
    $config = require __DIR__ . '/database.php';
    $db = new PostgreSQLDatabase($config);
    $db->connect();
    return $db;
});

$container->set(User::class, function($c) {
    return new User($c->get(DatabaseInterface::class));
});

$container->set(UserService::class, function($c) {
    return new UserService($c->get(User::class));
});

$container->set(Video::class, function($c) {
    return new Video($c->get(DatabaseInterface::class));
});

$container->set(Commentaire::class, function($c) {
    return new Commentaire($c->get(DatabaseInterface::class));
});

$container->set(Reaction::class, function($c) {
    return new Reaction($c->get(DatabaseInterface::class));
});

$container->set(Notification::class, function($c) {
    return new Notification($c->get(DatabaseInterface::class));
});

$container->set(Abonnement::class, function($c) {
    return new Abonnement($c->get(DatabaseInterface::class));
});

$container->set(UserRepository::class, function($c) {
    return new UserRepository($c->get(DatabaseInterface::class));
});

$container->set(Video::class, function($c) {
    return new Video($c->get(DatabaseInterface::class));
});

$container->set(SessionRepository::class, function($c) {
    return new SessionRepository($c->get(DatabaseInterface::class));
});

$container->set(LogRepository::class, function($c) {
    return new LogRepository($c->get(DatabaseInterface::class));
});

$container->set(TokenService::class, function($c) {
    return new TokenService();
});

$container->set(ValidationService::class, function($c) {
    return new ValidationService();
});

$container->set(UploadService::class, function($c) {
    return new UploadService();
});

$container->set(AuditService::class, function($c) {
    return new AuditService(
        $c->get(LogRepository::class),
        $c->get(DatabaseInterface::class)
    );
});

$container->set(NotificationCreationService::class, function($c) {
    return new NotificationCreationService(
        $c->get(DatabaseInterface::class),
        $c->get(User::class)
    );
});

$container->set(NotificationService::class, function($c) {
    return new NotificationService(
        $c->get(Notification::class),
        $c->get(User::class)
    );
});

$container->set(ReactionService::class, function($c) {
    return new ReactionService(
        $c->get(Reaction::class),
        $c->get(Video::class),
        $c->get(NotificationService::class)
    );
});

$container->set(AbonnementService::class, function($c) {
    return new AbonnementService(
        $c->get(Abonnement::class),
        $c->get(User::class),
        $c->get(NotificationCreationService::class)
    );
});

$container->set(AnalyticsService::class, function($c) {
    return new AnalyticsService(
        $c->get(DatabaseInterface::class)
    );
});

$container->set(AuthService::class, function($c) {
    return new AuthService(
        $c->get(UserRepository::class),
        $c->get(LogRepository::class),
        $c->get(TokenService::class),
        $c->get(ValidationService::class),
        $c->get(SessionRepository::class),
        $c->get(AuditService::class)
    );
});

$container->set(AuthController::class, function($c) {
    return new AuthController(
        $c->get(AuthService::class),
        $c->get(ValidationService::class),
        $c->get(AuditService::class),
        $c->get(AuthMiddleware::class)
    );
});

$container->set(CommentaireService::class, function($c) {
    return new CommentaireService(
        $c->get(Commentaire::class),
        $c->get(Video::class),
        $c->get(User::class),
        $c->get(DatabaseInterface::class),
        $c->get(NotificationCreationService::class)
    );
});

$container->set(VideoService::class, function($c) {
    return new VideoService(
        $c->get(Video::class),
        $c->get(Commentaire::class),
        $c->get(Reaction::class),
        $c->get(DatabaseInterface::class),
        $c->get(ValidationService::class),
        $c->get(AuditService::class),
        $c->get(NotificationCreationService::class),
        $c->get(UploadService::class)
    );
});

$container->set(AuthMiddleware::class, function($c) {
    return new AuthMiddleware(
        $c->get(TokenService::class),
        $c->get(SessionRepository::class),
        $c->get(DatabaseInterface::class),
        $c->get(AuditService::class)
    );
});

$container->set(TwoFactorService::class, function($c) {
    return new TwoFactorService(
        $c->get(User::class),
        $c->get(DatabaseInterface::class),
        $c->get(AuditService::class),
    );
});

return $container;