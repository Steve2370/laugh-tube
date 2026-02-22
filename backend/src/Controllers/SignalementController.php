<?php

namespace App\Controllers;

use App\Interfaces\DatabaseInterface;

class SignalementController
{
    private DatabaseInterface $db;

    private const RAISONS_VALIDES = [
        'spam', 'inapproprie', 'haine', 'desinformation', 'droits', 'autre'
    ];

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function signalerVideo(int $videoId, array $currentUser): void
    {
        $stmt = $this->db->prepare('SELECT id FROM videos WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $videoId]);
        if (!$stmt->fetch()) {
            $this->json(['error' => 'Vidéo introuvable'], 404);
            return;
        }

        $body    = json_decode(file_get_contents('php://input'), true) ?? [];
        $raison  = trim($body['raison'] ?? '');
        $desc    = trim(substr($body['description'] ?? '', 0, 500));

        if (!in_array($raison, self::RAISONS_VALIDES, true)) {
            $this->json(['error' => 'Raison invalide'], 422);
            return;
        }

        $stmt = $this->db->prepare(
            'SELECT id FROM signalements WHERE video_id = :vid AND reporter_id = :uid LIMIT 1'
        );
        $stmt->execute([':vid' => $videoId, ':uid' => $currentUser['id']]);
        if ($stmt->fetch()) {
            $this->json(['error' => 'Vous avez déjà signalé cette vidéo'], 409);
            return;
        }

        $stmt = $this->db->prepare(
            'INSERT INTO signalements (video_id, reporter_id, raison, description)
             VALUES (:vid, :uid, :raison, :desc)'
        );
        $stmt->execute([
            ':vid'    => $videoId,
            ':uid'    => $currentUser['id'],
            ':raison' => $raison,
            ':desc'   => $desc ?: null,
        ]);

        $this->json(['success' => true, 'message' => 'Signalement enregistré'], 201);
    }

    private function json(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
    }
}