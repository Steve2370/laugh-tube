<?php
namespace App\Middleware;

use App\Interfaces\DatabaseInterface;
use App\Repositories\SessionRepository;
use App\Services\AuditService;
use App\Services\TokenService;
use App\Utils\JsonResponse;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

class AuthMiddleware
{
    private const AUTH_HEADER = 'HTTP_AUTHORIZATION';
    private ?array $user = null;
    private ?string $token = null;

    public function __construct(
        private TokenService $tokenService,
        private SessionRepository $sessionRepository,
        private DatabaseInterface $db,
        private AuditService $auditService
    ) {}

    public static function optionalAuth(): array
    {
        $token = self::getBearerToken();
        if (!$token) {
            return [];
        }
        $payload = self::decodeToken($token);
        return is_array($payload) ? $payload : [];
    }


    private static function getBearerToken(): ?string
    {
        $header = $_SERVER[self::AUTH_HEADER] ?? $_SERVER['Authorization'] ?? null;

        if (!$header && function_exists('getallheaders')) {
            $headers = getallheaders();
            $header = $headers['Authorization'] ?? $headers['authorization'] ?? null;
        }

        if (!$header) return null;

        if (preg_match('/Bearer\s+(.+)/i', $header, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    public static function requireAuth(): array
    {
        $payload = self::optionalAuth();
        if (!$payload) {
            JsonResponse::unauthorized(['error' => 'AUTH_REQUIRED']);
        }
        return $payload;
    }

    private static function decodeToken(string $token): ?array
    {
        try {
            $secret = $_ENV['JWT_SECRET'] ?? getenv('JWT_SECRET') ?? null;
            if (!$secret) return null;

            $payload = JWT::decode($token, new Key($secret, 'HS256'));
            return json_decode(json_encode($payload), true);
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function handle(): bool
    {
        error_log("AUTHMIDDLEWARE FILE=" . __FILE__);
        error_log("AUTHMIDDLEWARE CLASS=" . __CLASS__);

        try {
            $token = $this->getTokenFromRequest();
            error_log("AUTHMIDDLEWARE token_extracted=" . ($token ? "YES" : "NO"));
            if (!$token) {
                return false;
            }

            $payload = $this->tokenService->validateToken($token);
            error_log("AUTHMIDDLEWARE payload=" . json_encode($payload));
            if (!is_array($payload)) {
                return false;
            }

            $userId = (int)($payload['sub'] ?? 0);
            if ($userId <= 0) {
                return false;
            }
            $userCheck = null;

            try {
                $userCheck = $this->db->fetchOne(
                    "SELECT id, username, email, role, email_verified, two_fa_enabled, deleted_at, avatar_url, cover_url
                          FROM users
                          WHERE id = $1
                          LIMIT 1",
                    [$userId]
                );
            } catch (\Throwable $e) {
            }

            if (!$userCheck) {
                try {
                    $userCheck = $this->db->fetchOne(
                        "SELECT id, username, email, role, email_verified, two_fa_enabled, deleted_at
                     FROM users
                     WHERE id = :id
                     LIMIT 1",
                        [':id' => $userId]
                    );
                } catch (\Throwable $e) {
                }
            }

            if (!$userCheck) {
                error_log("AUTHMIDDLEWARE user_not_found userId={$userId}");
                return false;
            }

            if (!empty($userCheck['deleted_at'])) {
                error_log("AUTHMIDDLEWARE user_deleted userId={$userId}");
                return false;
            }

            if (isset($payload['session_id'])) {
                $session = $this->sessionRepository->findByToken($payload['session_id']);
                if (!$session) {
                    error_log("AUTHMIDDLEWARE invalid_session session_id=" . $payload['session_id']);
                    return false;
                }
                if ((int)$session['user_id'] !== $userId) {
                    error_log("AUTHMIDDLEWARE session_user_mismatch session_user_id=" . $session['user_id'] . " token_sub={$userId}");
                    return false;
                }
            }

            $this->user = [
                'user_id'        => (int)$userCheck['id'],
                'sub'            => (int)$userCheck['id'],
                'username'       => $userCheck['username'] ?? ($payload['username'] ?? null),
                'email'          => $userCheck['email'] ?? null,
                'role'           => $userCheck['role'] ?? ($payload['role'] ?? 'membre'),
                'email_verified' => (bool)($userCheck['email_verified'] ?? false),
                'two_fa_enabled' => (bool)($userCheck['two_fa_enabled'] ?? false),
                'avatar_url'     => $userCheck['avatar_url'] ?? null,
                'cover_url'      => $userCheck['cover_url'] ?? null,
                'session_id'     => $payload['session_id'] ?? null,
                'jti'            => $payload['jti'] ?? null,
            ];

            return true;

        } catch (\Throwable $e) {
            error_log("AuthMiddleware::handle - Error: " . $e->getMessage());
            return false;
        }
    }

    public function getUser(): ?array
    {
        return $this->user ?? null;
    }

    public function getUserId(): ?int
    {
        return isset($this->user['user_id']) ? (int)$this->user['user_id'] : null;
    }

    public function handleOptional(): ?array
    {
        $ok = $this->handle();
        return $ok ? ($this->user ?? null) : null;
    }

    public function handleRequired(): array
    {
        $ok = $this->handle();
        if (!$ok || empty($this->user)) {
            throw new \Exception("Non authentifié");
        }
        return $this->user;
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

//    public function getUser(): ?array
//    {
//        return $this->user;
//    }
//
//    public function getUserId(): ?int
//    {
//        return $this->user['sub'] ?? null;
//    }

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