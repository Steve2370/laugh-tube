<?php

namespace App\Middleware;


class AdminMiddleware
{
    private AuthMiddleware $authMiddleware;

    public function __construct(AuthMiddleware $authMiddleware)
    {
        $this->authMiddleware = $authMiddleware;
    }

    public function handle(): array
    {
        $user = $this->authMiddleware->handleOptional();

        if (!is_array($user)) {
            $this->abort(401, 'Non authentifié');
        }

        if (($user['role'] ?? '') !== 'admin') {
            $this->abort(403, 'Accès réservé aux administrateurs');
        }

        return $user;
    }

    private function abort(int $code, string $message): never
    {
        http_response_code($code);
        header('Content-Type: application/json');
        echo json_encode(['error' => $message]);
        exit;
    }
}