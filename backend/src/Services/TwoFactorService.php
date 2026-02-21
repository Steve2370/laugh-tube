<?php

namespace App\Services;

use App\Interfaces\DatabaseInterface;
use App\Models\User;

class TwoFactorService
{
    private const TOTP_PERIOD = 30;
    private const TOTP_DIGITS = 6;
    private const BACKUP_CODES_COUNT = 10;
    private const MAX_ATTEMPTS = 3;
    private const LOCKOUT_DURATION = 900;

    public function __construct(
        private User $userModel,
        private DatabaseInterface $db,
        private AuditService $auditService
    ) {}

    public function generateSecret(): string
    {
        $randomBytes = random_bytes(20);
        return $this->base32Encode($randomBytes);
    }

    public function enable2FA(int $userId): array
    {
        try {
            $user = $this->userModel->findById($userId);

            // Si un secret existe déjà et que la 2FA n'est pas encore activée,
            // réutiliser le secret existant pour ne pas invalider le QR déjà scanné
            if (!empty($user['two_fa_secret']) && empty($user['two_fa_enabled'])) {
                $secret = $user['two_fa_secret'];
                $backupCodes = [];
            } else {
                $secret = $this->generateSecret();
                $backupCodes = $this->generateBackupCodes();

                $sql = "UPDATE users 
                        SET two_fa_secret = $1, 
                            two_fa_enabled = FALSE,  
                            updated_at = NOW()
                        WHERE id = $2";

                $this->db->execute($sql, [$secret, $userId]);
                $this->saveBackupCodes($userId, $backupCodes);
            }

            $qrCodeUrl = $this->generateQRCodeUrl($user['email'] ?? "user_{$userId}", $secret);

            $this->auditService->logSecurityEvent(
                $userId,
                '2fa_setup_initiated',
                ['method' => 'totp']
            );

            return [
                'success' => true,
                'secret' => $secret,
                'backup_codes' => $backupCodes,
                'qr_code_url' => $qrCodeUrl,
                'message' => 'Scannez le QR code avec votre application d\'authentification'
            ];

        } catch (\Exception $e) {
            error_log("TwoFactorService::enable2FA - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de l\'activation du 2FA',
                'code' => 500
            ];
        }
    }

    public function verify2FASetup(int $userId, string $code): array
    {
        try {
            $user = $this->userModel->findById($userId);

            if (!$user || empty($user['two_fa_secret'])) {
                return [
                    'success' => false,
                    'message' => '2FA non configuré',
                    'code' => 400
                ];
            }

            if (!$this->verifyTOTP($user['two_fa_secret'], $code)) {
                $this->auditService->logSecurityEvent(
                    $userId,
                    '2fa_setup_failed',
                    ['reason' => 'invalid_code']
                );

                return [
                    'success' => false,
                    'message' => 'Code invalide',
                    'code' => 400
                ];
            }

            $sql = "UPDATE users 
                    SET two_fa_enabled = TRUE, 
                        updated_at = NOW()
                    WHERE id = $1";

            $this->db->execute($sql, [$userId]);

            $this->auditService->logSecurityEvent(
                $userId,
                '2fa_enabled',
                ['method' => 'totp']
            );

            return [
                'success' => true,
                'message' => '2FA activé avec succès'
            ];

        } catch (\Exception $e) {
            error_log("TwoFactorService::verify2FASetup - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la vérification',
                'code' => 500
            ];
        }
    }

    public function disable2FA(int $userId, string $password): array
    {
        try {
            $user = $this->userModel->findById($userId);

            if (!$user || !password_verify($password, $user['password_hash'])) {
                $this->auditService->logSecurityEvent(
                    $userId,
                    '2fa_disable_failed',
                    ['reason' => 'invalid_password']
                );

                return [
                    'success' => false,
                    'message' => 'Mot de passe incorrect',
                    'code' => 401
                ];
            }

            $sql = "UPDATE users 
                    SET two_fa_enabled = FALSE,
                        two_fa_secret = NULL,
                        updated_at = NOW()
                    WHERE id = $1";

            $this->db->execute($sql, [$userId]);
            $this->db->execute("DELETE FROM two_fa_backup_codes WHERE user_id = $1", [$userId]);

            $this->auditService->logSecurityEvent(
                $userId,
                '2fa_disabled',
                []
            );

            return [
                'success' => true,
                'message' => '2FA désactivé'
            ];

        } catch (\Exception $e) {
            error_log("TwoFactorService::disable2FA - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la désactivation',
                'code' => 500
            ];
        }
    }

    public function verifyCode(int $userId, string $code): array
    {
        try {
            if ($this->isUserLockedOut($userId)) {
                return [
                    'success' => false,
                    'message' => 'Trop de tentatives. Réessayez dans 15 minutes',
                    'code' => 429
                ];
            }

            $user = $this->userModel->findById($userId);

            if (!$user || !$user['two_fa_enabled']) {
                return [
                    'success' => false,
                    'message' => '2FA non activé',
                    'code' => 400
                ];
            }

            $isValid = false;
            $method = null;

            if ($this->verifyTOTP($user['two_fa_secret'], $code)) {
                $isValid = true;
                $method = 'totp';
            }
            elseif ($this->verifyBackupCode($userId, $code)) {
                $isValid = true;
                $method = 'backup_code';
            }

            if ($isValid) {
                $this->resetFailedAttempts($userId);

                $this->auditService->logSecurityEvent(
                    $userId,
                    '2fa_verified',
                    ['method' => $method]
                );

                return [
                    'success' => true,
                    'message' => 'Code valide',
                    'method' => $method
                ];
            } else {
                $this->incrementFailedAttempts($userId);

                $this->auditService->logSecurityEvent(
                    $userId,
                    '2fa_verification_failed',
                    ['attempts' => $this->getFailedAttempts($userId)]
                );

                return [
                    'success' => false,
                    'message' => 'Code invalide',
                    'code' => 401
                ];
            }

        } catch (\Exception $e) {
            error_log("TwoFactorService::verifyCode - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la vérification',
                'code' => 500
            ];
        }
    }

    private function verifyTOTP(string $secret, string $code, int $window = 2): bool
    {
        $currentTime = time();

        for ($i = -$window; $i <= $window; $i++) {
            $timestamp = $currentTime + ($i * self::TOTP_PERIOD);
            $calculatedCode = $this->generateTOTP($secret, $timestamp);

            if (hash_equals($calculatedCode, $code)) {
                return true;
            }
        }

        return false;
    }

    private function generateTOTP(string $secret, ?int $timestamp = null): string
    {
        $timestamp = $timestamp ?? time();
        $timeCounter = floor($timestamp / self::TOTP_PERIOD);
        $key = $this->base32Decode($secret);
        $time = pack('N*', 0, $timeCounter);

        $hash = hash_hmac('sha1', $time, $key, true);

        $offset = ord($hash[19]) & 0xf;
        $code = (
            ((ord($hash[$offset]) & 0x7f) << 24) |
            ((ord($hash[$offset + 1]) & 0xff) << 16) |
            ((ord($hash[$offset + 2]) & 0xff) << 8) |
            (ord($hash[$offset + 3]) & 0xff)
        );

        $otp = $code % pow(10, self::TOTP_DIGITS);

        return str_pad((string)$otp, self::TOTP_DIGITS, '0', STR_PAD_LEFT);
    }

    private function generateBackupCodes(): array
    {
        $codes = [];

        for ($i = 0; $i < self::BACKUP_CODES_COUNT; $i++) {
            $code = bin2hex(random_bytes(4));
            $codes[] = strtoupper($code);
        }

        return $codes;
    }

    private function saveBackupCodes(int $userId, array $codes): void
    {
        try {
            $this->db->execute("DELETE FROM two_fa_backup_codes WHERE user_id = $1", [$userId]);

            foreach ($codes as $code) {
                $sql = "INSERT INTO two_fa_backup_codes (user_id, code, created_at)
                        VALUES ($1, $2, NOW())";

                $this->db->execute($sql, [$userId, $code]);
            }

        } catch (\Exception $e) {
            error_log("TwoFactorService::saveBackupCodes - Error: " . $e->getMessage());
        }
    }

    private function verifyBackupCode(int $userId, string $code): bool
    {
        try {
            $sql = "SELECT id, code FROM two_fa_backup_codes 
                    WHERE user_id = $1 AND used = FALSE";

            $backupCodes = $this->db->fetchAll($sql, [$userId]);

            foreach ($backupCodes as $backup) {
                if (hash_equals(strtoupper($backup['code']), strtoupper($code))) {
                    $this->db->execute(
                        "UPDATE two_fa_backup_codes SET used = TRUE, used_at = NOW() WHERE id = $1",
                        [$backup['id']]
                    );

                    return true;
                }
            }

            return false;

        } catch (\Exception $e) {
            error_log("TwoFactorService::verifyBackupCode - Error: " . $e->getMessage());
            return false;
        }
    }

    private function generateQRCodeUrl(string $accountName, string $secret): string
    {
        $issuer = 'LaughTube';
        $label = urlencode("{$issuer}:{$accountName}");

        $params = http_build_query([
            'secret' => $secret,
            'issuer' => $issuer,
            'algorithm' => 'SHA1',
            'digits' => self::TOTP_DIGITS,
            'period' => self::TOTP_PERIOD
        ]);

        $otpauthUrl = "otpauth://totp/{$label}?{$params}";

        return "https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=" . urlencode($otpauthUrl);
    }

    private function base32Encode(string $data): string
    {
        $base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $encoded = '';
        $buffer = 0;
        $bitsLeft = 0;

        foreach (str_split($data) as $char) {
            $buffer = ($buffer << 8) | ord($char);
            $bitsLeft += 8;

            while ($bitsLeft >= 5) {
                $encoded .= $base32Chars[($buffer >> ($bitsLeft - 5)) & 31];
                $bitsLeft -= 5;
            }
        }

        if ($bitsLeft > 0) {
            $encoded .= $base32Chars[($buffer << (5 - $bitsLeft)) & 31];
        }

        return $encoded;
    }

    private function base32Decode(string $data): string
    {
        $base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $base32CharsFlipped = array_flip(str_split($base32Chars));

        $decoded = '';
        $buffer = 0;
        $bitsLeft = 0;

        foreach (str_split(strtoupper($data)) as $char) {
            if (!isset($base32CharsFlipped[$char])) {
                continue;
            }

            $buffer = ($buffer << 5) | $base32CharsFlipped[$char];
            $bitsLeft += 5;

            if ($bitsLeft >= 8) {
                $decoded .= chr(($buffer >> ($bitsLeft - 8)) & 255);
                $bitsLeft -= 8;
            }
        }

        return $decoded;
    }

    private function incrementFailedAttempts(int $userId): void
    {
        try {
            $key = "2fa_failed_attempts_{$userId}";

            $sql = "INSERT INTO rate_limits (key, attempts, first_attempt, last_attempt)
                    VALUES ($1, 1, NOW(), NOW())
                    ON CONFLICT (key) 
                    DO UPDATE SET 
                        attempts = rate_limits.attempts + 1,
                        last_attempt = NOW()";

            $this->db->execute($sql, [$key]);

        } catch (\Exception $e) {
            error_log("TwoFactorService::incrementFailedAttempts - Error: " . $e->getMessage());
        }
    }

    private function getFailedAttempts(int $userId): int
    {
        try {
            $key = "2fa_failed_attempts_{$userId}";

            $result = $this->db->fetchOne(
                "SELECT attempts FROM rate_limits 
                 WHERE key = $1 
                 AND last_attempt > NOW() - INTERVAL '$2 seconds'",
                [$key, self::LOCKOUT_DURATION]
            );

            return (int)($result['attempts'] ?? 0);

        } catch (\Exception $e) {
            error_log("TwoFactorService::getFailedAttempts - Error: " . $e->getMessage());
            return 0;
        }
    }

    private function resetFailedAttempts(int $userId): void
    {
        try {
            $key = "2fa_failed_attempts_{$userId}";
            $this->db->execute("DELETE FROM rate_limits WHERE key = $1", [$key]);

        } catch (\Exception $e) {
            error_log("TwoFactorService::resetFailedAttempts - Error: " . $e->getMessage());
        }
    }

    private function isUserLockedOut(int $userId): bool
    {
        return $this->getFailedAttempts($userId) >= self::MAX_ATTEMPTS;
    }

    public function regenerateBackupCodes(int $userId, string $password): array
    {
        try {
            $user = $this->userModel->findById($userId);

            if (!$user || !password_verify($password, $user['password_hash'])) {
                return [
                    'success' => false,
                    'message' => 'Mot de passe incorrect',
                    'code' => 401
                ];
            }

            if (!$user['two_fa_enabled']) {
                return [
                    'success' => false,
                    'message' => '2FA non activé',
                    'code' => 400
                ];
            }

            $backupCodes = $this->generateBackupCodes();
            $this->saveBackupCodes($userId, $backupCodes);
            $this->auditService->logSecurityEvent(
                $userId,
                '2fa_backup_codes_regenerated',
                []
            );

            return [
                'success' => true,
                'backup_codes' => $backupCodes,
                'message' => 'Nouveaux codes générés'
            ];

        } catch (\Exception $e) {
            error_log("TwoFactorService::regenerateBackupCodes - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de la régénération',
                'code' => 500
            ];
        }
    }

    public function get2FAStatus(int $userId): array
    {
        try {
            $user = $this->userModel->findById($userId);

            if (!$user) {
                return [
                    'success' => false,
                    'message' => 'Utilisateur introuvable',
                    'code' => 404
                ];
            }

            $backupCodesLeft = 0;

            if ($user['two_fa_enabled']) {
                $result = $this->db->fetchOne(
                    "SELECT COUNT(*) as count FROM two_fa_backup_codes 
                     WHERE user_id = $1 AND used = FALSE",
                    [$userId]
                );

                $backupCodesLeft = (int)($result['count'] ?? 0);
            }

            return [
                'success' => true,
                'enabled' => (bool)$user['two_fa_enabled'],
                'backup_codes_left' => $backupCodesLeft,
                'configured' => !empty($user['two_fa_secret'])
            ];

        } catch (\Exception $e) {
            error_log("TwoFactorService::get2FAStatus - Error: " . $e->getMessage());

            return [
                'success' => false,
                'enabled' => false,
                'backup_codes_left' => 0,
                'configured' => false
            ];
        }
    }
}