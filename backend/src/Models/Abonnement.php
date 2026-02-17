<?php

namespace App\Models;

use App\Interfaces\DatabaseInterface;
use PDO;

class Abonnement
{
    public function __construct(private DatabaseInterface $db) {}

    public function abonneToi(int $abonneId, int $targetUserId): bool
    {
        $sql = "INSERT INTO abonnements (subscriber_id, subscribed_to_id, created_at) 
                VALUES ($1, $2, NOW())
                ON CONFLICT (subscriber_id, subscribed_to_id) DO NOTHING";

        return $this->db->execute($sql, [$abonneId, $targetUserId]);
    }

    public function countSubscribers(int $userId): int
    {
        try {
            $result = $this->db->fetchOne("
            SELECT COUNT(*) as count
            FROM abonnements
            WHERE subscribed_to_id = $1
        ", [$userId]);

            return (int)($result['count'] ?? 0);

        } catch (\Exception $e) {
            error_log("Abonnement::countSubscribers - Error: " . $e->getMessage());
            return 0;
        }
    }

    public function desabonneToi(int $subscriberId, int $targetUserId): bool
    {
        try {
            $result = $this->db->query("
            DELETE FROM abonnements
            WHERE subscriber_id = $1
              AND subscribed_to_id = $2
        ", [$subscriberId, $targetUserId]);

            return $result !== false;
        } catch (\Exception $e) {
            error_log("User::unsubscribe - Error: " . $e->getMessage());
            return false;
        }
    }

    public function isAbonne(int $abonneId, int $targetUserId): bool
    {
        $sql = "SELECT 1 FROM abonnements 
                WHERE subscriber_id = $1 AND subscribed_to_id = $2
                LIMIT 1";

        return $this->db->fetchOne($sql, [$abonneId, $targetUserId]) !== null;
    }

    public function conterAbonnes(int $targetUserId): int
    {
        $sql = "SELECT COUNT(*) as count FROM abonnements WHERE subscribed_to_id = $1";
        $result = $this->db->fetchOne($sql, [$targetUserId]);
        return $result ? (int)$result['count'] : 0;
    }

    public function conterAbonnements(int $abonneId): int
    {
        $sql = "SELECT COUNT(*) as count FROM abonnements WHERE subscriber_id = $1";
        $result = $this->db->fetchOne($sql, [$abonneId]);
        return $result ? (int)$result['count'] : 0;
    }

    public function listeAbonnesAvecAbonnement(int $userId): array
    {
        $sql = "SELECT 
                    u.id,
                    u.username,
                    u.avatar_url,
                    COALESCE(sc.subscriber_count, 0) AS subscriber_count
                FROM abonnements a
                JOIN users u ON u.id = a.subscriber_id
                LEFT JOIN (
                    SELECT subscribed_to_id, COUNT(*) AS subscriber_count 
                    FROM abonnements 
                    GROUP BY subscribed_to_id
                ) sc ON sc.subscribed_to_id = u.id
                WHERE a.subscribed_to_id = $1
                ORDER BY a.created_at DESC";

        return $this->db->fetchAll($sql, [$userId]);
    }

    public function listeAbonnementsAvecAbonnes(int $userId): array
    {
        $sql = "SELECT 
                    u.id,
                    u.username,
                    u.avatar_url,
                    COALESCE(sc.subscriber_count, 0) AS subscriber_count
                FROM abonnements s
                JOIN users u ON u.id = s.subscribed_to_id
                LEFT JOIN (
                    SELECT subscribed_to_id, COUNT(*) AS subscriber_count
                    FROM abonnements
                    GROUP BY subscribed_to_id
                ) sc ON sc.subscribed_to_id = u.id
                WHERE s.subscriber_id = $1 
                ORDER BY s.created_at DESC";

        return $this->db->fetchAll($sql, [$userId]);
    }

    public function toggleAbonnement(int $abonneId, int $targetUserId): bool
    {
        $isAbonne = $this->isAbonne($abonneId, $targetUserId);

        if ($isAbonne) {
            return $this->desabonneToi($abonneId, $targetUserId);
        } else {
            return $this->abonneToi($abonneId, $targetUserId);
        }
    }
}