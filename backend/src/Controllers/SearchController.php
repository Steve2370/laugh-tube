<?php

namespace App\Controllers;

use App\Interfaces\DatabaseInterface;

class SearchController
{
    private DatabaseInterface $db;

    public function __construct(DatabaseInterface $db)
    {
        $this->db = $db;
    }

    public function search(): void
    {
        $query = trim($_GET['q'] ?? '');

        if (strlen($query) < 2) {
            $this->json(['videos' => [], 'total' => 0]);
            return;
        }

        $limit  = min((int)($_GET['limit'] ?? 20), 50);
        $offset = max((int)($_GET['offset'] ?? 0), 0);

        $searchTerm = '%' . $query . '%';

        $videos = $this->db->fetchAll(
            "SELECT
                v.id,
                v.title,
                v.description,
                v.filename,
                v.thumbnail,
                v.duration,
                v.views,
                v.created_at,
                v.visibility,
                u.id       AS user_id,
                u.username,
                u.avatar_url,
                COALESCE(vv.view_count, v.views, 0) AS view_count,
                COALESCE(lk.like_count, 0)          AS likes
             FROM videos v
             JOIN users u ON u.id = v.user_id
             LEFT JOIN (
                 SELECT video_id, COUNT(*) AS view_count
                 FROM video_views
                 GROUP BY video_id
             ) vv ON vv.video_id = v.id
             LEFT JOIN (
                 SELECT video_id, COUNT(*) AS like_count
                 FROM likes
                 GROUP BY video_id
             ) lk ON lk.video_id = v.id
             WHERE v.visibility = 'publique'
               AND v.encoded = true
               AND u.deleted_at IS NULL
               AND (
                   v.title       ILIKE $1
                   OR v.description ILIKE $1
                   OR u.username    ILIKE $1
               )
             ORDER BY
                CASE WHEN v.title ILIKE $1 THEN 0 ELSE 1 END,
                vv.view_count DESC NULLS LAST,
                v.created_at DESC
             LIMIT $2 OFFSET $3",
            [$searchTerm, $limit, $offset]
        );

        $total = $this->db->fetchOne(
            "SELECT COUNT(*) AS total
             FROM videos v
             JOIN users u ON u.id = v.user_id
             WHERE v.visibility = 'publique'
               AND v.encoded = true
               AND u.deleted_at IS NULL
               AND (
                   v.title       ILIKE $1
                   OR v.description ILIKE $1
                   OR u.username    ILIKE $1
               )",
            [$searchTerm]
        );

        foreach ($videos as &$video) {
            $video['view_count']    = (int)$video['view_count'];
            $video['likes']         = (int)$video['likes'];
            $video['duration']      = (int)$video['duration'];
            $video['thumbnail_url'] = "/api/videos/{$video['id']}/thumbnail";
        }

        $this->json([
            'videos' => $videos,
            'total'  => (int)($total['total'] ?? 0),
            'query'  => $query,
            'limit'  => $limit,
            'offset' => $offset,
        ]);
    }

    private function json(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
    }
}