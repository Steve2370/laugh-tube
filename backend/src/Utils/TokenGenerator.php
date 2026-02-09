<?php

namespace App\Utils;

class TokenGenerator
{
    public static function generateEmailVerificationToken(): string {
        return bin2hex(random_bytes(32));
    }

    public static function generatePasswordResetToken(): string {
        return bin2hex(random_bytes(32));
    }

    public static function generateSessionToken(): string {
        return bin2hex(random_bytes(64));
    }

    public static function generate2FABackupCode(): string {
        $part1 = str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        $part2 = str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        return $part1 . '-' . $part2;
    }

    public static function generate2FABackupCodes(int $count = 10): array {
        $codes = [];
        for ($i = 0; $i < $count; $i++) {
            $codes[] = self::generate2FABackupCode();
        }
        return $codes;
    }

    public static function hashBackupCode(string $code): string {
        return password_hash($code, PASSWORD_BCRYPT);
    }

    public static function verifyBackupCode(string $code, string $hash): bool {
        return password_verify($code, $hash);
    }
}