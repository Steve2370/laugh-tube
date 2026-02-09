<?php

namespace App\Middleware;

use App\Repositories\LogRepository;
use App\Utils\SecurityHelper;

class RateLimitMiddleware {
    private LogRepository $logRepo;
    private int $maxAttempts;
    private int $lockoutMinutes;

    public function __construct(LogRepository $logRepo, int $maxAttempts = 5, int $lockoutMinutes = 15) {
        $this->logRepo = $logRepo;
        $this->maxAttempts = $maxAttempts;
        $this->lockoutMinutes = $lockoutMinutes;
    }

    public function checkLoginAttempts(string $email): bool {
        $ipAddress = SecurityHelper::getClientIp();

        $attempts = $this->logRepo->getRecentLoginAttempts($email, $ipAddress, $this->lockoutMinutes);

        if ($attempts >= $this->maxAttempts) {
            http_response_code(429);
            echo json_encode([
                'success' => false,
                'error' => "Trop de tentatives de connexion. Réessayez dans {$this->lockoutMinutes} minutes."
            ]);
            exit;
        }

        return true;
    }

    public function logAttempt(string $email, bool $success): void {
        $ipAddress = SecurityHelper::getClientIp();
        $this->logRepo->logLoginAttempt($email, $ipAddress, $success);
    }

    public static function checkRequestLimit(string $key, int $maxRequests = 60, int $windowMinutes = 1): bool {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $sessionKey = "rate_limit_{$key}";
        $now = time();

        if (!isset($_SESSION[$sessionKey])) {
            $_SESSION[$sessionKey] = ['count' => 1, 'start' => $now];
            return true;
        }

        $data = $_SESSION[$sessionKey];
        $windowSeconds = $windowMinutes * 60;

        if ($now - $data['start'] > $windowSeconds) {
            $_SESSION[$sessionKey] = ['count' => 1, 'start' => $now];
            return true;
        }

        if ($data['count'] >= $maxRequests) {
            http_response_code(429);
            echo json_encode([
                'success' => false,
                'error' => 'Trop de requêtes. Veuillez ralentir.'
            ]);
            exit;
        }

        $_SESSION[$sessionKey]['count']++;
        return true;
    }
}