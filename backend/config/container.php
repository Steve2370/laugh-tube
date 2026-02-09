<?php

use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthMiddleware;
use App\Middleware\RateLimitMiddleware;
use App\Providers\PostgreSQLDatabase;
use App\Repositories\LogRepository;
use App\Repositories\SessionRepository;
use App\Repositories\UserRepository;
use App\Services\AnalyticsService;
use App\Services\AuditService;
use App\Services\AuthService;
use App\Services\CommentaireService;
use App\Services\EmailService;
use App\Services\NotificationService;
use App\Services\SessionService;
use App\Services\TokenService;
use App\Services\TwoFactorService;
use App\Services\ValidationService;
use App\Services\VideoService;

$container = new class {
    private array $services = [];

    public function set(string $id, callable $factory): void
    {
        $this->services[$id] = $factory;
    }

    public function get(string $id)
    {
        if (!isset($this->services[$id])) {
            throw new Exception("Service $id not found in container");
        }

        if (is_callable($this->services[$id])) {
            $this->services[$id] = call_user_func($this->services[$id], $this);
        }

        return $this->services[$id];
    }
};

$dbConfig = require __DIR__ . '/database.php';
$emailConfig = require __DIR__ . '/email.php';

$container->set(DatabaseInterface::class, function() use ($dbConfig) {
    $db = new PostgreSQLDatabase($dbConfig);
    $db->connect();
    return $db;
});

$container->set(LogRepository::class, function($c) {
    return new LogRepository($c->get(DatabaseInterface::class));
});

$container->set(SessionRepository::class, function($c) {
    return new SessionRepository($c->get(DatabaseInterface::class));
});

$container->set(UserRepository::class, function($c) {
    return new UserRepository($c->get(DatabaseInterface::class));
});

$container->set(TokenService::class, function() {
    return new TokenService();
});

$container->set(ValidationService::class, function() {
    return new ValidationService();
});

$container->set(SessionService::class, function($c) {
    return new SessionService($c->get(SessionRepository::class));
});

$container->set(AuditService::class, function($c) {
    return new AuditService($c->get(LogRepository::class));
});

$container->set(EmailService::class, function($c) use ($emailConfig) {
    return new EmailService(
        $c->get(LogRepository::class),
        $emailConfig
    );
});

$container->set(AuthService::class, function($c) {
    return new AuthService(
        $c->get(UserRepository::class),
        $c->get(LogRepository::class),
        $c->get(SessionService::class),
        $c->get(ValidationService::class),
        $c->get(AuditService::class),
        $c->get(EmailService::class)
    );
});

$container->set(TwoFactorService::class, function($c) {
    return new TwoFactorService($c->get(UserRepository::class));
});

$container->set(VideoService::class, function($c) {
    return new VideoService($c->get(DatabaseInterface::class));
});

$container->set(AnalyticsService::class, function($c) {
    return new AnalyticsService($c->get(DatabaseInterface::class));
});

$container->set(CommentaireService::class, function($c) {
    return new CommentaireService($c->get(DatabaseInterface::class));
});

$container->set(NotificationService::class, function($c) {
    return new NotificationService($c->get(DatabaseInterface::class));
});

$container->set(AuthMiddleware::class, function($c) {
    return new AuthMiddleware(
        $c->get(TokenService::class),
        $c->get(SessionRepository::class),
        $c->get(DatabaseInterface::class),
        $c->get(AuditService::class)
    );
});

$container->set(RateLimitMiddleware::class, function($c) {
    return new RateLimitMiddleware($c->get(LogRepository::class));
});

return $container;