<?php
namespace App\Middleware;

use App\Interfaces\DatabaseInterface;
use App\Repositories\SessionRepository;
use App\Services\AuditService;
use App\Services\TokenService;

class AuthMiddleware
{
    private ?array $user = null;
    private ?string $token = null;
    private ?int $userId = null;

    public function __construct(
        private TokenService $tokenService,
        private SessionRepository $sessionRepository,
        private DatabaseInterface $db,
        private AuditService $auditService
    ) {}

    public static function optionalAuth()
    {
    }

    public function getUserId(): ?int
    {
        return $this->userId;
    }

    public static function requireAuth()
    {
    }

    public function handle(): ?array
    {
        error_log("AUTHMIDDLEWARE auth_header=" . ($_SERVER['HTTP_AUTHORIZATION'] ?? 'MISSING'));

        try {
            $token = $this->getTokenFromRequest();
            if (!$token) return null;

            $payload = $this->tokenService->validateToken($token);
            if (!$payload) return null;

            $userId = $payload['sub'] ?? null;
            if (!$userId) return null;

            $userCheck = $this->db->fetchOne(
                "SELECT id, username, email, role, email_verified, two_fa_enabled, deleted_at
             FROM users
             WHERE id = :id
             LIMIT 1",
                [':id' => (int)$userId]
            );

            if (!$userCheck || $userCheck['deleted_at'] !== null) {
                return null;
            }

            if (isset($payload['session_id'])) {
                $session = $this->sessionRepository->findById($payload['session_id']);
                if (!$session || empty($session['is_valid'])) return null;
                if ((int)$session['user_id'] !== (int)$userId) return null;
            }

            return [
                'user_id' => (int)$userCheck['id'],
                'username' => $userCheck['username'] ?? ($payload['username'] ?? null),
                'email' => $userCheck['email'] ?? null,
                'role' => $userCheck['role'] ?? ($payload['role'] ?? 'membre'),
                'email_verified' => (bool)($userCheck['email_verified'] ?? false),
                'two_fa_enabled' => (bool)($userCheck['two_fa_enabled'] ?? false),
            ];

        } catch (\Throwable $e) {
            error_log("AuthMiddleware::handle - Error: " . $e->getMessage());
            return null;
        }
    }

    public function handleOptional(): bool
    {
        try {
            $this->handle();
            return true;
        } catch (\Exception $e) {
            return true;
        }
    }

    public function requireRole(string $role): bool
    {
        if (!$this->handle()) {
            return false;
        }

        return ($this->user['role'] ?? null) === $role;
    }

    public function requireAnyRole(array $roles): bool
    {
        if (!$this->handle()) {
            return false;
        }

        return in_array($this->user['role'] ?? null, $roles, true);
    }

    public function requireOwnership(int $resourceOwnerId): bool
    {
        if (!$this->handle()) {
            return false;
        }

        if (($this->user['role'] ?? null) === 'admin') {
            return true;
        }

        return ($this->user['sub'] ?? null) === $resourceOwnerId;
    }

    public function require2FA(): bool
    {
        if (!$this->handle()) {
            return false;
        }

        return ($this->user['two_fa_enabled'] ?? false) === true;
    }

    public function requireVerifiedEmail(): bool
    {
        if (!$this->handle()) {
            return false;
        }

        return ($this->user['email_verified'] ?? false) === true;
    }

    public function getUser(): ?array
    {
        return $this->user;
    }

    public function getUserId(): ?int
    {
        return $this->user['sub'] ?? null;
    }

    public function getUserRole(): ?string
    {
        return $this->user['role'] ?? null;
    }

    public function getToken(): ?string
    {
        return $this->token;
    }

    public function isAuthenticated(): bool
    {
        return $this->user !== null;
    }

    public function isAdmin(): bool
    {
        return ($this->user['role'] ?? null) === 'admin';
    }

    private function getTokenFromRequest(): ?string
    {
        $headers = $this->getAuthorizationHeader();

        if (!$headers) {
            return null;
        }

        if (preg_match('/Bearer\s+(.*)$/i', $headers, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private function getAuthorizationHeader(): ?string
    {
        if (isset($_SERVER['Authorization'])) {
            return trim($_SERVER['Authorization']);
        }

        if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            return trim($_SERVER['HTTP_AUTHORIZATION']);
        }

        if (function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $headers = array_change_key_case($headers, CASE_LOWER);

            if (isset($headers['authorization'])) {
                return trim($headers['authorization']);
            }
        }

        return null;
    }

    public function logUnauthorizedAccess(string $reason = 'invalid_token'): void
    {
        $this->auditService->logSecurityEvent(
            $this->getUserId(),
            'unauthorized_access',
            [
                'reason' => $reason,
                'token_present' => $this->token !== null,
                'uri' => $_SERVER['REQUEST_URI'] ?? '/'
            ]
        );
    }
}