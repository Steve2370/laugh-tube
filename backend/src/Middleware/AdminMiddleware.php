<?php

namespace App\Middleware;

use App\Interfaces\DatabaseInterface;

class AdminMiddleware
{
    private DatabaseInterface $db;

    public function __construct($db)
    {
        $this->db = $db;
    }

    public function handle(): array
    {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!str_starts_with($authHeader, 'Bearer ')) {
            $this->abort(401, 'Token manquant');
        }

        $token = substr($authHeader, 7);

        $payload = $this->decodeToken($token);
        if (!$payload || empty($payload['user_id'])) {
            $this->abort(401, 'Token invalide');
        }

        $stmt = $this->db->prepare(
            'SELECT id, username, email, is_admin FROM users WHERE id = :id LIMIT 1'
        );
        $stmt->execute([':id' => $payload['user_id']]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$user) {
            $this->abort(401, 'Utilisateur introuvable');
        }

        if (!$user['is_admin']) {
            $this->abort(403, 'Accès réservé aux administrateurs');
        }

        return $user;
    }

    private function decodeToken(string $token): ?array
    {
        try {
            $parts = explode('.', $token);
            if (count($parts) !== 3) return null;

            $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);

            if (isset($payload['exp']) && $payload['exp'] < time()) {
                return null;
            }

            return $payload;
        } catch (\Throwable) {
            return null;
        }
    }

    private function abort(int $code, string $message): never
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(['error' => $message]);
        exit;
    }
}