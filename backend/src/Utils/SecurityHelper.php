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

    public static function hashPassword(string $password): string
    {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
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

    public static function generateEmailVerificationToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    public static function generatePasswordResetToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    public static function generate2FABackupCode(): string
    {
        $part1 = str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        $part2 = str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT);

        return $part1 . '-' . $part2;
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
}