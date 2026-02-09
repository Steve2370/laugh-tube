<?php

namespace App\Utils;

class SecurityHelper
{

    public static function getClientIp(): string
    {
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) {
            return $_SERVER['HTTP_CF_CONNECTING_IP'];
        }

        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($ips[0]);
        }

        return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    }

    public static function getUserAgent(): string
    {
        return $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
    }

    public static function isValidIpAddress(string $ip): bool
    {
        return filter_var($ip, FILTER_VALIDATE_IP) !== false;
    }

    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }

    public static function verifyPassword(string $password, string $hash): bool
    {
        return password_verify($password, $hash);
    }

    public static function isSecurePassword(string $password): bool
    {
        if (strlen($password) < 8) {
            return false;
        }

        if (!preg_match('/[A-Z]/', $password)) {
            return false;
        }

        if (!preg_match('/[a-z]/', $password)) {
            return false;
        }

        if (!preg_match('/[0-9]/', $password)) {
            return false;
        }

        return true;
    }

    public static function sanitizeInput(mixed $input): mixed
    {
        if (is_array($input)) {
            return array_map([self::class, 'sanitizeInput'], $input);
        }

        if (!is_string($input)) {
            return $input;
        }

        $clean = strip_tags($input);
        $clean = htmlspecialchars($clean, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $clean = str_replace(["\0", "\x00"], '', $clean);

        return $clean;
    }

    public static function sanitizeEmail(string $email): string
    {
        return filter_var(trim(strtolower($email)), FILTER_SANITIZE_EMAIL);
    }

    public static function escapeSqlLike(string $value): string
    {
        return str_replace(['%', '_'], ['\\%', '\\_'], $value);
    }

    public static function isXssFree(string $input): bool
    {
        $dangerous = [
            '<script',
            'javascript:',
            'onerror=',
            'onload=',
            'onclick=',
            'onfocus=',
            '<iframe',
            '<embed',
            '<object'
        ];

        $lowerInput = strtolower($input);

        foreach ($dangerous as $pattern) {
            if (strpos($lowerInput, $pattern) !== false) {
                return false;
            }
        }

        return true;
    }

    public static function generateCsrfToken(): string
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        $token = bin2hex(random_bytes(32));
        $_SESSION['csrf_token'] = $token;
        $_SESSION['csrf_token_time'] = time();

        return $token;
    }

    public static function verifyCsrfToken(string $token): bool
    {
        if (session_status() === PHP_SESSION_NONE) {
            session_start();
        }

        if (!isset($_SESSION['csrf_token']) || !isset($_SESSION['csrf_token_time'])) {
            return false;
        }

        if (time() - $_SESSION['csrf_token_time'] > 3600) {
            return false;
        }

        return hash_equals($_SESSION['csrf_token'], $token);
    }

    public static function generateEmailVerificationToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    public static function generatePasswordResetToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    public static function generateSessionToken(): string
    {
        return bin2hex(random_bytes(64));
    }

    public static function generate2FABackupCode(): string
    {
        $part1 = str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        $part2 = str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT);

        return $part1 . '-' . $part2;
    }

    public static function generate2FABackupCodes(int $count = 10): array
    {
        $codes = [];

        for ($i = 0; $i < $count; $i++) {
            $codes[] = self::generate2FABackupCode();
        }

        return $codes;
    }

    public static function hashBackupCode(string $code): string
    {
        return password_hash($code, PASSWORD_BCRYPT);
    }

    public static function verifyBackupCode(string $code, string $hash): bool
    {
        return password_verify($code, $hash);
    }

    public static function generateRandomString(int $length = 32): string
    {
        return bin2hex(random_bytes($length / 2));
    }

    public static function generateApiKey(): string
    {
        return 'lt_' . bin2hex(random_bytes(32));
    }

    public static function maskEmail(string $email): string
    {
        $parts = explode('@', $email);

        if (count($parts) !== 2) {
            return $email;
        }

        $name = $parts[0];
        $domain = $parts[1];

        if (strlen($name) <= 2) {
            $masked = $name[0] . str_repeat('*', strlen($name) - 1);
        } else {
            $masked = substr($name, 0, 2) . str_repeat('*', strlen($name) - 2);
        }

        return $masked . '@' . $domain;
    }

    public static function maskPhone(string $phone): string
    {
        $length = strlen($phone);

        if ($length <= 4) {
            return str_repeat('*', $length);
        }

        return substr($phone, 0, 2) . str_repeat('*', $length - 4) . substr($phone, -2);
    }

    public static function maskCreditCard(string $card): string
    {
        $card = preg_replace('/\s+/', '', $card);
        $length = strlen($card);

        if ($length < 8) {
            return str_repeat('*', $length);
        }

        return str_repeat('*', $length - 4) . substr($card, -4);
    }

    public static function timeConstantCompare(string $known, string $user): bool
    {
        return hash_equals($known, $user);
    }

    public static function generateRateLimitKey(string $action, ?int $userId = null): string
    {
        if ($userId) {
            return "rate_limit_{$action}_user_{$userId}";
        }

        $ip = self::getClientIp();
        return "rate_limit_{$action}_ip_" . md5($ip);
    }

    public static function calculateBackoff(int $attempts): int
    {
        return min(pow(2, $attempts), 3600);
    }

    public static function getRequestContext(): array
    {
        return [
            'ip' => self::getClientIp(),
            'user_agent' => self::getUserAgent(),
            'method' => $_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN',
            'uri' => $_SERVER['REQUEST_URI'] ?? '/',
            'timestamp' => time()
        ];
    }

    public static function hashIpForPrivacy(string $ip): string
    {
        return hash('sha256', $ip . date('Y-m-d')); // Change chaque jour
    }
}