<?php

namespace App\Services;

use App\Interfaces\DatabaseInterface;
use PDO;

class AnalyticsService
{
    public function __construct(
        private DatabaseInterface $db
    ) {}

    public function recordView(int $videoId, array $data): array
    {
        $hasUserId = !empty($data['user_id']);
        $hasSessionId = isset($data['session_id']) && $data['session_id'] !== '' && $data['session_id'] !== null;

        if (!$hasUserId && !$hasSessionId) {
            return [
                'success' => false,
                'code' => 400,
                'message' => 'session_id ou user_id requis'
            ];
        }

        try {
            $videoExists = $this->db->fetchOne(
                "SELECT id FROM videos WHERE id = $1",
                [$videoId]
            );

            if (!$videoExists) {
                return [
                    'success' => false,
                    'code' => 404,
                    'message' => 'Vidéo introuvable'
                ];
            }
        } catch (\Exception $e) {
            error_log("AnalyticsService::recordView - Check video error: " . $e->getMessage());
            return [
                'success' => false,
                'code' => 500,
                'message' => 'Erreur base de données'
            ];
        }

        $completedBool = (bool)($data['completed'] ?? false);
        $completedStr = $completedBool ? 'true' : 'false';

        error_log("AnalyticsService::recordView - Completed: $completedStr (type: " . gettype($completedStr) . ")");

        $sql = "INSERT INTO video_views
            (video_id, user_id, session_id, watch_time, watch_percentage, completed, ip_address, user_agent, viewed_at)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, NOW())";

        try {
            $this->db->execute($sql, [
                $videoId,
                $data['user_id'] ?? null,
                $data['session_id'] ?? null,
                (int)($data['watch_time'] ?? 0),
                (float)($data['watch_percentage'] ?? 0),
                $completedStr,
                $data['ip_address'] ?? null,
                $data['user_agent'] ?? null,
            ]);

            return [
                'success' => true,
                'data' => [
                    'alreadyViewed' => false
                ]
            ];

        } catch (\Exception $e) {
            $errorMessage = $e->getMessage();

            if (strpos($errorMessage, '23505') !== false || strpos($errorMessage, 'duplicate') !== false) {
                return [
                    'success' => true,
                    'data' => [
                        'alreadyViewed' => true
                    ]
                ];
            }

            error_log("AnalyticsService::recordView - Erreur: " . $errorMessage);

            return [
                'success' => false,
                'code' => 500,
                'message' => 'Erreur base de données: ' . $errorMessage
            ];
        }
    }

    public function checkUserViewed(int $videoId, int $userId): array
    {
        try {
            $result = $this->db->fetchOne(
                "SELECT EXISTS(
                    SELECT 1 FROM video_views
                    WHERE video_id = $1 AND user_id = $2
                ) AS exists",
                [$videoId, $userId]
            );

            $hasViewed = (bool)($result['exists'] ?? false);

            return ['hasViewed' => $hasViewed];

        } catch (\Exception $e) {
            error_log("AnalyticsService::checkUserViewed - Error: " . $e->getMessage());
            return ['hasViewed' => false];
        }
    }

    public function getViewCounts(int $videoId): array
    {
        try {
            $result = $this->db->fetchOne(
                "SELECT
                    COUNT(*)::int AS total_views,
                    COUNT(DISTINCT session_id)::int AS unique_views
                 FROM video_views
                 WHERE video_id = $1",
                [$videoId]
            );

            if (!$result) {
                return [
                    'total_views' => 0,
                    'unique_views' => 0
                ];
            }

            return [
                'total_views' => (int)$result['total_views'],
                'unique_views' => (int)$result['unique_views']
            ];

        } catch (\Exception $e) {
            error_log("AnalyticsService::getViewCounts - Error: " . $e->getMessage());
            return [
                'total_views' => 0,
                'unique_views' => 0
            ];
        }
    }

    public function getTrendingVideos(int $period, int $limit): array
    {
        $sql = "SELECT
                v.id,
                v.title,
                v.thumbnail,
                v.user_id,
                v.views,
                u.username,
                COUNT(vv.id)::int AS views_period
             FROM videos v
             LEFT JOIN video_views vv ON vv.video_id = v.id
                AND vv.viewed_at >= NOW() - ($1 || ' days')::interval
             JOIN users u ON u.id = v.user_id
             WHERE v.visibility = 'publique'
               AND v.encoded = TRUE
             GROUP BY v.id, u.username
             ORDER BY views_period DESC, v.views DESC
             LIMIT $2";

        try {
            $results = $this->db->fetchAll($sql, [$period, $limit]);
            return $results ?? [];

        } catch (\Exception $e) {
            error_log("AnalyticsService::getTrendingVideos - Error: " . $e->getMessage());
            return [];
        }
    }

    public function getVideoAnalytics(int $videoId, int $userId, string $period): array
    {
        $periodDays = (int)$period;

        try {
            $ownerResult = $this->db->fetchOne(
                "SELECT user_id FROM videos WHERE id = $1",
                [$videoId]
            );

            if (!$ownerResult) {
                return [
                    'success' => false,
                    'code' => 404,
                    'message' => 'Vidéo non trouvée'
                ];
            }

            $ownerId = (int)$ownerResult['user_id'];

            if ($ownerId !== $userId) {
                return [
                    'success' => false,
                    'code' => 403,
                    'message' => 'Accès refusé'
                ];
            }

            $analytics = $this->db->fetchOne(
                "SELECT
                    COUNT(*)::int AS views,
                    COUNT(DISTINCT session_id)::int AS unique_views,
                    COALESCE(SUM(watch_time), 0)::int AS total_watch_time,
                    COALESCE(AVG(watch_percentage), 0)::float AS avg_watch_percentage,
                    SUM(CASE WHEN completed = TRUE THEN 1 ELSE 0 END)::int AS completes
                 FROM video_views
                 WHERE video_id = $1
                   AND viewed_at >= NOW() - ($2 || ' days')::interval",
                [$videoId, $periodDays]
            );

            if (!$analytics) {
                return [
                    'success' => false,
                    'code' => 404,
                    'message' => 'Aucune donnée disponible'
                ];
            }

            $views = (int)$analytics['views'];
            $completes = (int)$analytics['completes'];
            $completionRate = $views > 0 ? round(($completes / $views) * 100, 2) : 0;

            return [
                'success' => true,
                'data' => [
                    'views' => $views,
                    'unique_views' => (int)$analytics['unique_views'],
                    'total_watch_time' => (int)$analytics['total_watch_time'],
                    'avg_watch_percentage' => round((float)$analytics['avg_watch_percentage'], 2),
                    'completes' => $completes,
                    'completion_rate' => $completionRate
                ]
            ];

        } catch (\Exception $e) {
            error_log("AnalyticsService::getVideoAnalytics - Error: " . $e->getMessage());

            return [
                'success' => false,
                'code' => 500,
                'message' => 'Erreur lors de la récupération des analytics'
            ];
        }
    }

    public function cleanupOldSessions(): array
    {
        try {
            $this->db->execute(
                "DELETE FROM video_views WHERE viewed_at < NOW() - INTERVAL '180 days'"
            );

            return [
                'success' => true,
                'message' => 'Anciennes sessions nettoyées'
            ];

        } catch (\Exception $e) {
            error_log("AnalyticsService::cleanupOldSessions - Error: " . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors du nettoyage'
            ];
        }
    }
}