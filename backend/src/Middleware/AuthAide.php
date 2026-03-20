<?php

namespace App\Middleware;

use App\Models\User;
use App\Services\TokenService;
use App\Utils\JsonResponse;

class AuthAide
{
    private static ?TokenService $tokenService = null;
    private static ?User $userModel = null;

    public static function getAuthenticatedUser(): ?array
    {
        $token = self::getTokenFromRequest();

        if (!$token) {
            return null;
        }

        $payload = self::$tokenService->validateToken($token);

        if (!$payload) {
            return null;
        }
        return $payload;
    }

    public static function optionalAuth(): ?array
    {
        try {
            return self::getAuthenticatedUser();
        } catch (\Throwable $e) {
            return null;
        }
    }


    public static function requireAuth(): ?array
    {
        $user = self::getAuthenticatedUser();

        if (!$user) {
            JsonResponse::unauthorized(['error' => 'Non autorisé', 'message' => 'Token manquant ou invalide']);
        }
        return $user;
    }

    public static function requireRole(string $role): array
    {
        $user = self::requireAuth();

        if ($user['role'] !== $role) {
            JsonResponse::forbidden(['error' => 'Accès refusé', 'message' => "Rôle '$role' requis"]);
        }
        return $user;
    }

    private static function getTokenFromRequest(): ?string
    {
        $headers = self::getAuthorizationHeader();

        if (!$headers) {
            return null;
        }

        if (preg_match('/Bearer\s+(.*)$/i', $headers, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private static function getAuthorizationHeader(): ?string
    {
        $headers = null;

        if (isset($_SERVER['Authorization'])) {
            $headers = trim($_SERVER["Authorization"]);
        } elseif (isset($_SERVER['HTTP_AUTHORIZATION'])) {
            $headers = trim($_SERVER["HTTP_AUTHORIZATION"]);
        } elseif (function_exists('apache_request_headers')) {
            $requestheaders = apache_request_headers();
            $requestheaders = array_combine(
                array_map('ucwords', array_keys($requestheaders)),
                array_values($requestheaders));

            if (isset($requestheaders['Authorization'])) {
                $headers = trim($requestheaders['Authorization']);
            }
        }

        return $headers;
    }

    public static function hasRole(string $role): bool
    {
        $user = self::getAuthenticatedUser();
        return $user && $user ['role'] === $role;
    }
}