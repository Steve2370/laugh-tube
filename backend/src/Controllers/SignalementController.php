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
        $video = $this->db->fetchOne(
            'SELECT id FROM videos WHERE id = $1 LIMIT 1',
            [$videoId]
        );
        if (!$video) {
            $this->json(['error' => 'Vidéo introuvable'], 404);
            return;
        }

        $body   = json_decode(file_get_contents('php://input'), true) ?? [];
        $raison = trim($body['raison'] ?? '');
        $desc   = trim(substr($body['description'] ?? '', 0, 500));

        if (!in_array($raison, self::RAISONS_VALIDES, true)) {
            $this->json(['error' => 'Raison invalide'], 422);
            return;
        }

        $existing = $this->db->fetchOne(
            'SELECT id FROM signalements WHERE video_id = $1 AND reporter_id = $2 LIMIT 1',
            [$videoId, $currentUser['id']]
        );
        if ($existing) {
            $this->json(['error' => 'Vous avez déjà signalé cette vidéo'], 409);
            return;
        }

        $this->db->fetchOne(
            'INSERT INTO signalements (video_id, reporter_id, raison, description)
             VALUES ($1, $2, $3, $4)
             RETURNING id',
            [$videoId, $currentUser['id'], $raison, $desc ?: null]
        );

        $this->json(['success' => true, 'message' => 'Signalement enregistré'], 201);
    }

    private function json(array $data, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json');
        echo json_encode($data);
    }
}