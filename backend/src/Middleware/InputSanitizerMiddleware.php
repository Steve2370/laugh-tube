<?php

namespace App\Middleware;

use App\Utils\SecurityHelper;

class InputSanitizerMiddleware {

    public static function validateJsonInput(): ?array
    {
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';

        if ($contentType && stripos($contentType, 'application/json') === false) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Content-Type doit être application/json'
            ]);
            return null;
        }

        $rawInput = file_get_contents('php://input');

        if ($rawInput === false || trim($rawInput) === '') {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Corps de requête JSON manquant'
            ]);
            return null;
        }

        try {
            $data = json_decode($rawInput, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'JSON invalide'
            ]);
            return null;
        }

        if (!is_array($data)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Le JSON doit être un objet'
            ]);
            return null;
        }

        return $data;
    }
}