<?php

namespace App\Services;

use App\Repositories\SessionRepository;
use App\Utils\SecurityHelper;
use App\Utils\TokenGenerator;

class SessionService {
    private SessionRepository $sessionRepo;
    private array $config;

    public function __construct(SessionRepository $sessionRepo, array $config = []) {
        $this->sessionRepo = $sessionRepo;
        $this->config = array_merge([
            'session_lifetime_hours' => 24
        ], $config);
    }

    public function createSession(int $userId): ?array {
        $token = TokenGenerator::generateSessionToken();
        $expiresAt = date('Y-m-d H:i:s', time() + ($this->config['session_lifetime_hours'] * 3600));

        $sessionToken = $this->sessionRepo->createSession([
            'user_id' => $userId,
            'token' => $token,
            'ip_address' => SecurityHelper::getClientIp(),
            'user_agent' => SecurityHelper::getUserAgent(),
            'expires_at' => $expiresAt
        ]);

        if (!$sessionToken) {
            return null;
        }

        return [
            'token' => $sessionToken,
            'expires_at' => $expiresAt
        ];
    }

    public function validateSession(string $token): ?array {
        $session = $this->sessionRepo->findByToken($token);

        if (!$session) {
            return null;
        }

        $this->sessionRepo->updateActivity($token);

        return $session;
    }

    public function invalidateSession(string $token): bool {
        return $this->sessionRepo->invalidateSession($token);
    }

    public function invalidateAllUserSessions(int $userId): bool {
        return $this->sessionRepo->invalidateAllUserSessions($userId);
    }

    public function getUserActiveSessions(int $userId): array {
        return $this->sessionRepo->getUserActiveSessions($userId);
    }

    public function cleanupExpiredSessions(): int {
        return $this->sessionRepo->deleteExpiredSessions();
    }
}