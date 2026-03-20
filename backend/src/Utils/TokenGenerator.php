<?php

namespace App\Utils;

class TokenGenerator
{

    public static function generateSessionToken(): string {
        return bin2hex(random_bytes(64));
    }

    public static function generate2FABackupCode(): string {
        $part1 = str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        $part2 = str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT);
        return $part1 . '-' . $part2;
    }
}