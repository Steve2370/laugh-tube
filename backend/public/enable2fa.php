<?php
require_once __DIR__ . '/../bootstrap.php';

use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthMiddleware;
use App\Services\AuditService;
use App\Services\TwoFactorService;
use App\Utils\JsonResponse;
use App\Utils\SecurityHelper;

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    JsonResponse::methodNotAllowed(['error' => 'Méthode non autorisée']);
}

try {
    $container = require __DIR__ . '/../config/container.php';

    $authMiddleware = $container->get(AuthMiddleware::class);
    $twoFactorService = $container->get(TwoFactorService::class);
    $db = $container->get(DatabaseInterface::class);
    $auditService = $container->get(AuditService::class);

    if (!$authMiddleware->handle()) {
        JsonResponse::unauthorized(['error' => 'Non authentifié']);
    }

    $userId = $authMiddleware->getUserId();

    $user = $db->fetchOne(
        "SELECT id, username FROM users WHERE id = $1",
        [$userId]
    );

    if (!$user) {
        JsonResponse::notFound(['error' => 'Utilisateur introuvable']);
    }

    $secret = $twoFactorService->generateSecret();
    $qrCodeSVG = $twoFactorService->generateQRCodeUrl($user['username'], $secret);
    $backupCodes = $twoFactorService->generateBackupCodes();

    $db->execute(
        "UPDATE users SET two_fa_secret = $1, updated_at = NOW() WHERE id = $2",
        [$secret, $userId]
    );

    $auditService->logSecurityEvent($userId, '2fa_setup_initiated', [
        'backup_codes_generated' => count($backupCodes)
    ]);

    JsonResponse::success([
        'secret' => $secret,
        'qr_code' => $qrCodeSVG,
        'backup_codes' => $backupCodes,
        'message' => 'Scannez le QR code avec Google Authenticator et entrez le code pour activer'
    ]);

} catch (Exception $e) {
    error_log("2FA enable error: " . $e->getMessage());
    JsonResponse::serverError(['error' => 'Erreur serveur']);
}