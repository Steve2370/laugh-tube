<?php

namespace App\Services;

use App\Repositories\LogRepository;
use App\Utils\SecurityHelper;

class AuditService {
    private LogRepository $logRepo;

    public function __construct(LogRepository $logRepo) {
        $this->logRepo = $logRepo;
    }

    public function log(string $eventType, ?int $userId = null, ?string $description = null, ?array $additionalData = null): bool {
        return $this->logRepo->logSecurityEvent([
            'user_id' => $userId,
            'event_type' => $eventType,
            'description' => $description,
            'ip_address' => SecurityHelper::getClientIp(),
            'user_agent' => SecurityHelper::getUserAgent(),
            'additional_data' => $additionalData ? json_encode($additionalData) : null
        ]);
    }

    public function logUserRegistered(int $userId, string $email): bool {
        return $this->log('user_registered', $userId, "Nouvel utilisateur: {$email}");
    }

    public function logEmailVerified(int $userId): bool {
        return $this->log('email_verified', $userId, "Email vérifié");
    }

    public function logLoginSuccess(int $userId): bool {
        return $this->log('login_success', $userId, "Connexion réussie");
    }

    public function logLoginFailed(string $email): bool {
        return $this->log('login_failed', null, "Échec de connexion: {$email}");
    }

    public function logLogout(int $userId): bool {
        return $this->log('logout', $userId, "Déconnexion");
    }

    public function log2FAEnabled(int $userId): bool {
        return $this->log('2fa_enabled', $userId, "Authentification 2FA activée");
    }

    public function log2FADisabled(int $userId): bool {
        return $this->log('2fa_disabled', $userId, "Authentification 2FA désactivée");
    }

    public function log2FASuccess(int $userId): bool {
        return $this->log('2fa_success', $userId, "Code 2FA vérifié");
    }

    public function log2FAFailed(int $userId): bool {
        return $this->log('2fa_failed', $userId, "Échec vérification 2FA");
    }

    public function logPasswordChanged(int $userId): bool {
        return $this->log('password_changed', $userId, "Mot de passe modifié");
    }

    public function logPasswordResetRequested(int $userId, string $email): bool {
        return $this->log('password_reset_requested', $userId, "Reset mot de passe demandé: {$email}");
    }

    public function logAccountDeletionRequested(int $userId): bool {
        return $this->log('account_deletion_requested', $userId, "Suppression de compte demandée");
    }

    public function logAccountDeletionCancelled(int $userId): bool {
        return $this->log('account_deletion_cancelled', $userId, "Suppression de compte annulée");
    }

    public function logAccountDeleted(int $userId): bool {
        return $this->log('account_deleted', $userId, "Compte supprimé définitivement");
    }

    public function logSuspiciousActivity(int $userId, string $description, ?array $data = null): bool {
        return $this->log('suspicious_activity', $userId, $description, $data);
    }

    public function getUserLogs(int $userId, int $limit = 50): array {
        return $this->logRepo->getUserSecurityLogs($userId, $limit);
    }

    public function logSecurityEvent(mixed $userId, string $eventType, array $metadata): bool
    {
        try {
            $ipAddress = $_SERVER['REMOTE_ADDR'] ?? null;
            $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? null;
            $cleanUserId = $userId ? (int)$userId : null;
            $metadataJson = !empty($metadata) ? json_encode($metadata, JSON_UNESCAPED_UNICODE) : null;

            $sql = "INSERT INTO audit_logs 
                (user_id, event_type, ip_address, user_agent, metadata, created_at)
                VALUES ($1, $2, $3, $4, $5, NOW())";

            $this->db->execute($sql, [
                $cleanUserId,
                $eventType,
                $ipAddress,
                $userAgent,
                $metadataJson
            ]);

            return true;

        } catch (\Exception $e) {
            error_log("AuditService::logSecurityEvent - Error: " . $e->getMessage());
            error_log("AuditService::logSecurityEvent - Event: $eventType, UserId: $userId");

            return false;
        }
    }
}