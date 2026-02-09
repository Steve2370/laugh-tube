<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Exception;
use Random\RandomException;

class TokenService
{
    private string $secret;
    private int $expirationTime;
    private int $refreshExpirationTime;
    private string $algorithm;

    public function __construct(
        ?string $secret = null,
        int $expirationTime = 3600,
        int $refreshExpirationTime = 604800,
        string $algorithm = 'HS256') {
        $this->secret = $secret ?? ($_ENV['JWT_SECRET'] ?? 'secret123');
        $this->expirationTime = $expirationTime;
        $this->refreshExpirationTime = $refreshExpirationTime;
        $this->algorithm = $algorithm;
    }

    public function generateToken(array $userData): string
    {
        $payload = [
            'sub' => $userData['id'],
            'username' => $userData['username'],
            'role' => $userData['role'],
            'iat' => time(),
            'exp' => time() + $this->expirationTime,
            'jti' => bin2hex(random_bytes(16))
        ];

        return JWT::encode($payload, $this->secret, $this->algorithm);
    }

    /**
     * @throws RandomException
     */
    public function generateRefreshToken(array $userData): string
    {
        $payload = [
            'sub' => $userData['id'],
            'type' => 'refresh',
            'iat' => time(),
            'exp' => time() + $this->refreshExpirationTime,
            'jti' => bin2hex(random_bytes(16))
        ];

        return JWT::encode($payload, $this->secret, $this->algorithm);
    }

    public function validateToken(string $token): ?array
    {
        try {
            $decoded = JWT::decode($token, new Key($this->secret, $this->algorithm));
            return (array) $decoded;
        } catch (Exception $e) {
            error_log('Token validation error: ' . $e->getMessage());
            return null;
        }
    }

    public function isTokenExpired(string $token): bool
    {
        $payload = $this->validateToken($token);

        if (!$payload) {
            return true;
        }

        return isset($payload['exp']) && $payload['exp'] < time();
    }

    public function decodeTokenSansValider(string $token): ?array
    {
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) {
                return null;
            }

            $payload = json_decode(base64_decode($parts[1]), true);
            return $payload;
        } catch (Exception $e) {
            return null;
        }
    }

    public function refreshAccessToken(string $refreshToken, array $userData): ?string
    {
        $payload = $this->decodeTokenSansValider($refreshToken);

        if (!$payload || !isset($payload['type']) || $payload['type'] !== 'refresh') {
            return null;
        }

        if ($payload['sub'] !== $userData['id']) {
            return null;
        }

        return $this->generateToken($userData);
    }
}