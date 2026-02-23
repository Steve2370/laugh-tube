<?php

namespace App\Middleware;

use App\Repositories\LogRepository;
use App\Utils\SecurityHelper;

class RateLimitMiddleware
{
    private LogRepository $logRepo;
    private int $maxAttempts;
    private int $lockoutMinutes;

    private const LIMITS = [
        'auth'    => ['max' => 10,  'window' => 60],
        'upload'  => ['max' => 5,   'window' => 60],
        'api'     => ['max' => 120, 'window' => 60],
        'comment' => ['max' => 20,  'window' => 60],
        'signal'  => ['max' => 5,   'window' => 300],
    ];

    public function __construct(LogRepository $logRepo, int $maxAttempts = 5, int $lockoutMinutes = 15)
    {
        $this->logRepo        = $logRepo;
        $this->maxAttempts    = $maxAttempts;
        $this->lockoutMinutes = $lockoutMinutes;
    }

    public function checkLoginAttempts(string $email): bool
    {
        $ipAddress = SecurityHelper::getClientIp();
        $attempts  = $this->logRepo->getRecentLoginAttempts($email, $ipAddress, $this->lockoutMinutes);

        if ($attempts >= $this->maxAttempts) {
            http_response_code(429);
            echo json_encode([
                'success' => false,
                'error'   => "Trop de tentatives de connexion. Réessayez dans {$this->lockoutMinutes} minutes.",
            ]);
            exit;
        }

        return true;
    }

    public function logAttempt(string $email, bool $success): void
    {
        $ipAddress = SecurityHelper::getClientIp();
        $this->logRepo->logLoginAttempt($email, $ipAddress, $success);
    }

    public static function check(string $type = 'api'): void
    {
        $ip     = SecurityHelper::getClientIp();
        $limit  = self::LIMITS[$type] ?? self::LIMITS['api'];
        $key    = "rl_{$type}_" . md5($ip);
        $now    = time();
        $window = $limit['window'];
        $max    = $limit['max'];

        if (function_exists('apcu_fetch')) {
            $data = apcu_fetch($key) ?: ['count' => 0, 'start' => $now];

            if ($now - $data['start'] > $window) {
                $data = ['count' => 1, 'start' => $now];
            } else {
                $data['count']++;
            }

            apcu_store($key, $data, $window);

            if ($data['count'] > $max) {
                self::tooManyRequests($type, $window);
            }
        } else {
            if (session_status() === PHP_SESSION_NONE) {
                session_start();
            }

            if (!isset($_SESSION[$key]) || ($now - $_SESSION[$key]['start']) > $window) {
                $_SESSION[$key] = ['count' => 1, 'start' => $now];
            } else {
                $_SESSION[$key]['count']++;
            }

            if ($_SESSION[$key]['count'] > $max) {
                self::tooManyRequests($type, $window);
            }
        }
    }

    public static function checkRequestLimit(string $key, int $maxRequests = 60, int $windowMinutes = 1): bool
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $sessionKey    = "rate_limit_{$key}";
        $now           = time();
        $windowSeconds = $windowMinutes * 60;

        if (!isset($_SESSION[$sessionKey])) {
            $_SESSION[$sessionKey] = ['count' => 1, 'start' => $now];
            return true;
        }

        $data = $_SESSION[$sessionKey];

        if ($now - $data['start'] > $windowSeconds) {
            $_SESSION[$sessionKey] = ['count' => 1, 'start' => $now];
            return true;
        }

        if ($data['count'] >= $maxRequests) {
            http_response_code(429);
            echo json_encode(['success' => false, 'error' => 'Trop de requêtes. Veuillez ralentir.']);
            exit;
        }

        $_SESSION[$sessionKey]['count']++;
        return true;
    }

    private static function tooManyRequests(string $type, int $window): never
    {
        $retryAfter = $window;
        http_response_code(429);
        header("Retry-After: {$retryAfter}");
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error'   => 'Trop de requêtes. Veuillez ralentir.',
            'type'    => $type,
            'retry_after_seconds' => $retryAfter,
        ]);
        exit;
    }
}