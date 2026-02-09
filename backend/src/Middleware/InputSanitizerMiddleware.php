<?php

namespace App\Middleware;

use App\Utils\SecurityHelper;

class InputSanitizerMiddleware {

    public static function sanitize(): void {
        $_GET = self::sanitizeArray($_GET);
        $_POST = self::sanitizeArray($_POST);

        $input = file_get_contents('php://input');
        if ($input) {
            $decoded = json_decode($input, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $_POST = array_merge($_POST, self::sanitizeArray($decoded));
            }
        }
    }

    private static function sanitizeArray(array $data): array {
        $sanitized = [];
        foreach ($data as $key => $value) {
            $sanitizedKey = SecurityHelper::sanitizeInput($key);
            $sanitized[$sanitizedKey] = SecurityHelper::sanitizeInput($value);
        }
        return $sanitized;
    }

    public static function getCleanInput(string $key, $default = null) {
        return $_POST[$key] ?? $_GET[$key] ?? $default;
    }

    public static function getAllCleanInputs(): array {
        return array_merge($_GET, $_POST);
    }

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