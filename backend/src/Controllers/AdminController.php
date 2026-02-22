<?php

namespace App\Controllers;

use App\Interfaces\DatabaseInterface;

class AdminController
{
    private DatabaseInterface $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function getUsers(): void
    {
        $stmt = $this->db->query(
            "SELECT
                u.id,
                u.username,
                u.email,
                u.is_admin,
                u.created_at,
                COUNT(DISTINCT v.id)  AS video_count,
                COUNT(DISTINCT s.id)  AS subscriber_count
             FROM users u
             LEFT JOIN videos       v ON v.user_id = u.id
             LEFT JOIN abonnements  s ON s.channel_id = u.id
             GROUP BY u.id, u.username, u.email, u.is_admin, u.created_at
             ORDER BY u.created_at DESC"
        );

        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($users as &$user) {
            $user['is_admin']         = (bool)$user['is_admin'];
            $user['video_count']      = (int)$user['video_count'];
            $user['subscriber_count'] = (int)$user['subscriber_count'];
        }

        $this->json(['users' => $users]);
    }

    public function deleteUser(int $userId): void
    {
        $stmt = $this->db->prepare('SELECT is_admin FROM users WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            $this->json(['error' => 'Utilisateur introuvable'], 404);
            return;
        }

        if ($user['is_admin']) {
            $this->json(['error' => 'Impossible de supprimer un compte admin'], 403);
            return;
        }

        $this->deleteUserVideoFiles($userId);

        $stmt = $this->db->prepare('DELETE FROM users WHERE id = :id');
        $stmt->execute([':id' => $userId]);

        $this->json(['success' => true, 'message' => 'Compte supprimé']);
    }


    public function getVideos(): void
    {
        $stmt = $this->db->query(
            "SELECT
                v.id,
                v.title,
                v.user_id,
                u.username,
                v.created_at,
                v.file_path,
                COALESCE(stats.views,    0) AS views,
                COALESCE(stats.likes,    0) AS likes,
                COALESCE(stats.dislikes, 0) AS dislikes,
                COUNT(DISTINCT sig.id)       AS report_count
             FROM videos v
             JOIN users u ON u.id = v.user_id
             LEFT JOIN (
                 SELECT
                     video_id,
                     COUNT(*)                                          AS views,
                     SUM(CASE WHEN type = 'like'    THEN 1 ELSE 0 END) AS likes,
                     SUM(CASE WHEN type = 'dislike' THEN 1 ELSE 0 END) AS dislikes
                 FROM (
                     SELECT video_id, NULL AS type FROM vues
                     UNION ALL
                     SELECT video_id, type FROM reactions
                 ) sub
                 GROUP BY video_id
             ) stats ON stats.video_id = v.id
             LEFT JOIN signalements sig ON sig.video_id = v.id
             GROUP BY v.id, v.title, v.user_id, u.username, v.created_at, v.file_path,
                      stats.views, stats.likes, stats.dislikes
             ORDER BY v.created_at DESC"
        );

        $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($videos as &$video) {
            $video['views']        = (int)$video['views'];
            $video['likes']        = (int)$video['likes'];
            $video['dislikes']     = (int)$video['dislikes'];
            $video['report_count'] = (int)$video['report_count'];
            $video['thumbnail_url'] = "/api/videos/{$video['id']}/thumbnail";
            unset($video['file_path']);
        }

        $this->json(['videos' => $videos]);
    }

    public function deleteVideo(int $videoId): void
    {
        $stmt = $this->db->prepare(
            'SELECT id, file_path, user_id FROM videos WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $videoId]);
        $video = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$video) {
            $this->json(['error' => 'Vidéo introuvable'], 404);
            return;
        }

        $this->deleteVideoFiles($video['file_path'], $videoId);

        $stmt = $this->db->prepare('DELETE FROM videos WHERE id = :id');
        $stmt->execute([':id' => $videoId]);

        $this->json(['success' => true, 'message' => 'Vidéo supprimée']);
    }

    public function getSignalements(): void
    {
        $stmt = $this->db->query(
            "SELECT
                sig.id,
                sig.video_id,
                sig.raison,
                sig.description,
                sig.statut,
                sig.created_at,
                sig.reviewed_at,
                v.title          AS video_title,
                author.username  AS video_author,
                reporter.username AS reporter_username
             FROM signalements sig
             JOIN  videos v        ON v.id = sig.video_id
             JOIN  users  author   ON author.id = v.user_id
             LEFT JOIN users reporter ON reporter.id = sig.reporter_id
             ORDER BY
                CASE sig.statut WHEN 'pending' THEN 0 ELSE 1 END,
                sig.created_at DESC"
        );

        $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

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

        $stmt = $this->db->prepare('SELECT id FROM signalements WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $reportId]);
        if (!$stmt->fetch()) {
            $this->json(['error' => 'Signalement introuvable'], 404);
            return;
        }

        $stmt = $this->db->prepare(
            "UPDATE signalements
             SET statut = :statut,
                 reviewed_at = CASE WHEN :statut2 != 'pending' THEN NOW() ELSE NULL END,
                 reviewed_by = CASE WHEN :statut3 != 'pending' THEN :admin_id ELSE NULL END
             WHERE id = :id"
        );
        $stmt->execute([
            ':statut'   => $statut,
            ':statut2'  => $statut,
            ':statut3'  => $statut,
            ':admin_id' => $adminUser['id'],
            ':id'       => $reportId,
        ]);

        $this->json(['success' => true, 'statut' => $statut]);
    }

    private function deleteVideoFiles(?string $filePath, int $videoId): void
    {
        $baseDirs = [
            '/var/www/html/uploads/videos/',
            '/var/www/html/uploads/thumbnails/',
            '/var/www/html/uploads/encoded/',
        ];

        if ($filePath && file_exists($filePath)) {
            @unlink($filePath);
        }

        foreach ($baseDirs as $dir) {
            foreach (glob("{$dir}{$videoId}.*") ?: [] as $file) {
                @unlink($file);
            }
        }
    }

    private function deleteUserVideoFiles(int $userId): void
    {
        $stmt = $this->db->prepare('SELECT id, file_path FROM videos WHERE user_id = :uid');
        $stmt->execute([':uid' => $userId]);
        $videos = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($videos as $video) {
            $this->deleteVideoFiles($video['file_path'], $video['id']);
        }
    }

    private function json(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
    }
}