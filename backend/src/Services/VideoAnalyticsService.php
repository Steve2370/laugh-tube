<?php

namespace App\Services;

use App\Models\Video;
use App\Models\VideoView;
use PDO;

class VideoAnalyticsService
{
    private Video $videoModel;
    private VideoView $videoViewModel;
    private PDO $pdo;

    public function __construct(?Video $videoModel = null, ?VideoView $videoViewModel = null)
    {
        $this->videoModel = $videoModel ?? new Video();
        $this->videoViewModel = $videoViewModel ?? new VideoView();
        $this->pdo = \Database::getConnection();
    }

    public function getTrendingVideos(int $period = 7, int $limit = 10): array
    {
        try {
            $stmt = $this->pdo->prepare("SELECT * FROM get_trending_videos(:period, :limit)");
            $stmt->execute(['period' => $period, 'limit' => $limit]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (\PDOException $e) {
            error_log('Error getting trending videos: ' . $e->getMessage());
            return [];
        }
    }

    public function getViewCounts(int $videoId): array
    {
        if (!$this->videoModel->exists($videoId)) {
            return ['success' => false, 'message' => 'Vidéo non trouvée', 'code' => 404];
        }

        $counts = $this->videoViewModel->getViewCounts($videoId);

        return [
            'success' => true,
            'data' => [
                'views' => $counts['views'],
                'unique_views' => $counts['unique_views'],
                'videoId' => $videoId
            ]
        ];
    }

    public function checkUserViewed(int $videoId, int $userId): array
    {
        $hasViewed = $this->videoViewModel->hasViewed($videoId, $userId, null);
        return ['hasViewed' => $hasViewed];
    }

    public function recordView(int $videoId, array $data): array
    {
        if (!$this->videoModel->exists($videoId, true)) {
            return ['success' => false, 'message' => 'Vidéo introuvable', 'code' => 404];
        }

        try {
            $this->pdo->beginTransaction();

            $userId = $data['user_id'] ?? null;
            $sessionId = $data['session_id'] ?? null;

            if ($this->videoViewModel->hasViewed($videoId, $userId, $sessionId)) {
                $this->videoViewModel->updateView($videoId, $userId, $sessionId, $data);
                $this->pdo->commit();

                return [
                    'success' => true,
                    'data' => [
                        'message' => 'Vue mise à jour',
                        'alreadyViewed' => true
                    ]
                ];
            }

            if ($sessionId && !$userId) {
                $this->videoViewModel->createAnonymousSession($sessionId, $data);
            }

            $viewId = $this->videoViewModel->record($videoId, $userId, $sessionId, $data);
            $this->pdo->commit();

            return [
                'success' => true,
                'data' => [
                    'viewId' => $viewId,
                    'alreadyViewed' => false
                ]
            ];

        } catch (\PDOException $e) {
            $this->pdo->rollBack();
            error_log('Error recording view: ' . $e->getMessage());

            return [
                'success' => false,
                'message' => 'Erreur lors de l\'enregistrement de la vue',
                'code' => 500
            ];
        }
    }

    public function getVideoAnalytics(int $videoId, int $requestingUserId, string $period): array
    {
        $owner = $this->videoModel->proprietaire($videoId);

        if (!$owner) {
            return ['success' => false, 'message' => 'Vidéo non trouvée', 'code' => 404];
        }

        if ($owner !== $requestingUserId) {
            return ['success' => false, 'message' => 'Accès refusé', 'code' => 403];
        }

        $dateFilter = $this->getDateFilter($period);

        try {
            $stmt = $this->pdo->prepare("
                SELECT 
                    COUNT(*) as total_views,
                    COUNT(DISTINCT COALESCE(user_id, session_id)) as unique_viewers,
                    COALESCE(AVG(watch_time), 0) as avg_watch_time,
                    COUNT(*) FILTER (WHERE completed = true) as completed_views
                FROM video_views 
                WHERE video_id = :video_id $dateFilter
            ");
            $stmt->execute(['video_id' => $videoId]);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);

            $stmt = $this->pdo->prepare("
                SELECT 
                    DATE(viewed_at) as date,
                    COUNT(*) as views
                FROM video_views 
                WHERE video_id = :video_id $dateFilter
                GROUP BY DATE(viewed_at)
                ORDER BY DATE(viewed_at) ASC
            ");
            $stmt->execute(['video_id' => $videoId]);
            $viewsByDay = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $stmt = $this->pdo->prepare("SELECT duration FROM videos WHERE id = :id");
            $stmt->execute(['id' => $videoId]);
            $videoDuration = (int) ($stmt->fetchColumn() ?: 1);

            $retentionRate = $stats['total_views'] > 0
                ? ($stats['completed_views'] / $stats['total_views'])
                : 0;

            return [
                'success' => true,
                'data' => [
                    'totalViews' => (int) $stats['total_views'],
                    'uniqueViewers' => (int) $stats['unique_viewers'],
                    'averageWatchTime' => round($stats['avg_watch_time']),
                    'completedViews' => (int) $stats['completed_views'],
                    'retentionRate' => round($retentionRate, 3),
                    'videoDuration' => $videoDuration,
                    'viewsByDay' => array_map(function($row) {
                        return [
                            'date' => $row['date'],
                            'views' => (int) $row['views']
                        ];
                    }, $viewsByDay)
                ]
            ];

        } catch (\PDOException $e) {
            error_log('Error getting analytics: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Erreur lors de la récupération des analytics',
                'code' => 500
            ];
        }
    }

    public function cleanupOldSessions(): array
    {
        try {
            $this->videoViewModel->cleanupOldSessions();
            return ['success' => true, 'message' => 'Nettoyage effectué avec succès'];
        } catch (\PDOException $e) {
            error_log('Error cleaning up sessions: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Erreur lors du nettoyage'];
        }
    }

    private function getDateFilter(string $period): string
    {
        switch ($period) {
            case '1d':
                return "AND viewed_at >= NOW() - INTERVAL '1 day'";
            case '7d':
                return "AND viewed_at >= NOW() - INTERVAL '7 days'";
            case '30d':
                return "AND viewed_at >= NOW() - INTERVAL '30 days'";
            case '1y':
                return "AND viewed_at >= NOW() - INTERVAL '1 year'";
            default:
                return "AND viewed_at >= NOW() - INTERVAL '7 days'";
        }
    }
}