<?php

namespace App\Controllers;

use App\Interfaces\DatabaseInterface;
use App\Middleware\AdminMiddleware;
use App\Services\EmailService;
use App\Utils\JsonResponse;
use App\Utils\SecurityHelper;

class AdminController
{
    private DatabaseInterface $db;
    private AdminMiddleware $adminMiddleware;
    private EmailService $emailService;

    public function __construct($db, $adminMiddleware, $emailService)
    {
        $this->db = $db;
        $this->adminMiddleware = $adminMiddleware;
        $this->emailService = $emailService;
    }

    public function getUsers(): void
    {
        $users = $this->db->fetchAll(
            "SELECT
            u.id,
            u.username,
            u.email,
            u.role,
            u.created_at,
            u.deleted_at,
            u.account_locked_until,
            u.failed_login_attempts,
            u.email_verified,
            COUNT(DISTINCT v.id) AS video_count,
            COUNT(DISTINCT a.id) AS subscriber_count
         FROM users u
         LEFT JOIN videos v ON v.user_id = u.id
         LEFT JOIN abonnements a ON a.subscribed_to_id = u.id
         GROUP BY u.id, u.username, u.email, u.role, u.created_at,
                  u.deleted_at, u.account_locked_until, u.failed_login_attempts,
                  u.email_verified
         ORDER BY u.created_at DESC");

        foreach ($users as &$user) {
            $user['is_admin'] = ($user['role'] === 'admin');
            $user['video_count'] = (int)$user['video_count'];
            $user['subscriber_count'] = (int)$user['subscriber_count'];
            $user['failed_login_attempts'] = (int)$user['failed_login_attempts'];
            $user['email_verified'] = (bool)$user['email_verified'];
        }

        $this->json(['users' => $users]);
    }

    public function deleteUser(int $userId): void
    {
        $user = $this->db->fetchOne(
            'SELECT role FROM users WHERE id = $1 LIMIT 1',
            [$userId]
        );

        if (!$user) {
            $this->json(['error' => 'Utilisateur introuvable'], 404);
            return;
        }

        if ($user['role'] === 'admin') {
            $this->json(['error' => 'Impossible de supprimer un compte admin'], 403);
            return;
        }

        $this->deleteUserVideoFiles($userId);
        $this->db->fetchOne('DELETE FROM users WHERE id = $1', [$userId]);
        $this->json(['success' => true, 'message' => 'Compte supprimé']);
    }

    public function getVideos(): void
    {
        $videos = $this->db->fetchAll(
            "SELECT
                v.id,
                v.title,
                v.user_id,
                u.username,
                v.created_at,
                v.filename,
                COALESCE(vv.views, 0) AS views,
                COALESCE(lk.likes, 0) AS likes,
                COALESCE(dk.dislikes, 0) AS dislikes,
                COUNT(DISTINCT sig.id)   AS report_count
             FROM videos v
             JOIN users u ON u.id = v.user_id
             LEFT JOIN (
                 SELECT video_id, COUNT(*) AS views
                 FROM video_views
                 GROUP BY video_id
             ) vv ON vv.video_id = v.id
             LEFT JOIN (
                 SELECT video_id, COUNT(*) AS likes
                 FROM likes
                 GROUP BY video_id
             ) lk ON lk.video_id = v.id
             LEFT JOIN (
                 SELECT video_id, COUNT(*) AS dislikes
                 FROM dislikes
                 GROUP BY video_id
             ) dk ON dk.video_id = v.id
             LEFT JOIN signalements sig ON sig.video_id = v.id
             GROUP BY v.id, v.title, v.user_id, u.username, v.created_at, v.filename,
                      vv.views, lk.likes, dk.dislikes
             ORDER BY v.created_at DESC"
        );

        foreach ($videos as &$video) {
            $video['views'] = (int)$video['views'];
            $video['likes'] = (int)$video['likes'];
            $video['dislikes'] = (int)$video['dislikes'];
            $video['report_count'] = (int)$video['report_count'];
            $video['thumbnail_url'] = "/api/videos/{$video['id']}/thumbnail";
            unset($video['filename']);
        }

        $this->json(['videos' => $videos]);
    }

    public function deleteVideo(int $videoId): void
    {
        $video = $this->db->fetchOne(
            'SELECT id, filename, user_id FROM videos WHERE id = $1 LIMIT 1',
            [$videoId]
        );

        if (!$video) {
            $this->json(['error' => 'Vidéo introuvable'], 404);
            return;
        }

        $this->deleteVideoFiles($video['filename'], $videoId);

        $this->db->fetchOne('DELETE FROM videos WHERE id = $1', [$videoId]);

        $this->json(['success' => true, 'message' => 'Vidéo supprimée']);
    }

    public function getSignalements(): void
    {
        $reports = $this->db->fetchAll(
            "SELECT
                sig.id,
                sig.video_id,
                sig.raison,
                sig.description,
                sig.statut,
                sig.created_at,
                sig.reviewed_at,
                v.title AS video_title,
                author.username AS video_author,
                reporter.username AS reporter_username
             FROM signalements sig
             JOIN  videos v ON v.id = sig.video_id
             JOIN  users  author ON author.id = v.user_id
             LEFT JOIN users reporter ON reporter.id = sig.reporter_id
             ORDER BY
                CASE sig.statut WHEN 'pending' THEN 0 ELSE 1 END,
                sig.created_at DESC"
        );

        $this->json(['signalements' => $reports]);
    }

    public function updateSignalement(int $reportId, array $adminUser): void
    {
        $body   = json_decode(file_get_contents('php://input'), true) ?? [];
        $statut = $body['statut'] ?? '';

        if (!in_array($statut, ['pending', 'reviewed', 'dismissed'], true)) {
            $this->json(['error' => 'Statut invalide'], 422);
            return;
        }

        $existing = $this->db->fetchOne(
            'SELECT id FROM signalements WHERE id = $1 LIMIT 1',
            [$reportId]
        );
        if (!$existing) {
            $this->json(['error' => 'Signalement introuvable'], 404);
            return;
        }

        $adminId = $adminUser['id'] ?? $adminUser['sub'] ?? null;

        $this->db->fetchOne(
            "UPDATE signalements
             SET statut      = $1,
                 reviewed_at = CASE WHEN $2 != 'pending' THEN NOW() ELSE NULL END,
                 reviewed_by = CASE WHEN $3 != 'pending' THEN $4 ELSE NULL END
             WHERE id = $5",
            [$statut, $statut, $statut, $adminId, $reportId]
        );

        $this->json(['success' => true, 'statut' => $statut]);
    }

    private function deleteVideoFiles(?string $filename, int $videoId): void
    {
        $baseDirs = [
            '/var/www/html/uploads/videos/',
            '/var/www/html/uploads/thumbnails/',
            '/var/www/html/uploads/encoded/',
        ];

        foreach ($baseDirs as $dir) {
            if ($filename && file_exists($dir . $filename)) {
                @unlink($dir . $filename);
            }
            foreach (glob("{$dir}{$videoId}.*") ?: [] as $file) {
                @unlink($file);
            }
        }
    }

    private function deleteUserVideoFiles(int $userId): void
    {
        $videos = $this->db->fetchAll(
            'SELECT id, filename FROM videos WHERE user_id = $1',
            [$userId]
        );

        foreach ($videos as $video) {
            $this->deleteVideoFiles($video['filename'], $video['id']);
        }
    }

    private function json(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
    }

    public function suspendUser(int $userId): void
    {
        $adminUser = $this->adminMiddleware->handle();
        if (!$adminUser) return;

        $input = json_decode(file_get_contents('php://input'), true);
        $hours = max(1, min(8760, (int)($input['hours'] ?? 24))); // 1h à 1 an
        $until = date('Y-m-d H:i:s', time() + ($hours * 3600));
        $reason = SecurityHelper::sanitizeInput($input['reason'] ?? 'Violation des règles');

        $user = $this->db->fetchOne(
            "UPDATE users SET account_locked_until = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING id, username, email",
            [$until, $userId]
        );

        $this->emailService->sendAccountSuspendedEmail((int)$user['id'], $user['email'], $user['username'], $until, $reason);

        if (!$user) {
            JsonResponse::notFound(['error' => 'Utilisateur introuvable']);
            return;
        }

        JsonResponse::success([
            'message' => "Compte suspendu jusqu'au " . date('d/m/Y H:i', strtotime($until)),
            'until' => $until,
        ]);
    }

    public function unsuspendUser(int $userId): void
    {
        $adminUser = $this->adminMiddleware->handle();
        if (!$adminUser) return;

        $user = $this->db->fetchOne(
            "UPDATE users 
         SET account_locked_until = NULL, failed_login_attempts = 0 
         WHERE id = $1 
         RETURNING id, username, email",
            [$userId]
        );

        if (!$user) {
            JsonResponse::notFound(['error' => 'Utilisateur introuvable']);
            return;
        }

        JsonResponse::success(['message' => 'Suspension levée']);
    }

    public function restoreUser(int $userId): void
    {
        $adminUser = $this->adminMiddleware->handle();
        if (!$adminUser) return;

        $user = $this->db->fetchOne(
            "UPDATE users 
         SET deleted_at = NULL, failed_login_attempts = 0, account_locked_until = NULL
         WHERE id = $1 
         RETURNING id, username, email",
            [$userId]
        );

        if (!$user) {
            JsonResponse::notFound(['error' => 'Utilisateur introuvable']);
            return;
        }

        JsonResponse::success(['message' => 'Compte restauré']);
    }
}