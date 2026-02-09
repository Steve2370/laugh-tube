<?php

namespace App\Utils;

class JsonResponse
{
    public static function success(array $data, int $code = 200): void
    {
        self::send($data, $code);
    }

    public static function created(array $data): void
    {
        self::send($data, 201);
    }

    public static function noContent(): void
    {
        http_response_code(204);
        header('Content-Type: application/json');
        exit;
    }

    public static function badRequest(array $data): void
    {
        self::send($data, 400);
    }

    public static function unauthorized(array $data): void
    {
        self::send($data, 401);
    }

    public static function forbidden(array $data): void
    {
        self::send($data, 403);
    }

    public static function notFound(array $data): void
    {
        self::send($data, 404);
    }

    public static function conflict(array $data): void
    {
        self::send($data, 409);
    }

    public static function gone(array $data = []): void
    {
        self::send($data, 410);
    }

    public static function unprocessableEntity(array $data): void
    {
        self::send($data, 422);
    }

    public static function tooManyRequests(array $data = []): void
    {
        $defaultData = [
            'error' => 'Trop de requêtes',
            'message' => 'Veuillez réessayer plus tard'
        ];

        self::send(array_merge($defaultData, $data), 429);
    }

    public static function serverError(array $data): void
    {
        self::send($data, 500);
    }

    public static function validationError(array $errors): void
    {
        self::send([
            'success' => false,
            'errors' => $errors,
            'message' => 'Erreurs de validation'
        ], 422);
    }

    public static function sendWithCors(array $data, int $code = 200, array $corsOrigins = ['*']): void
    {
        http_response_code($code);

        header('Access-Control-Allow-Origin: ' . implode(', ', $corsOrigins));
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
        header('Access-Control-Max-Age: 3600');
        header('Content-Type: application/json; charset=utf-8');

        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        exit;
    }

    private static function send(array $data, int $code): void
    {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');

        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function paginated(array $items, int $total, int $page, int $limit): void
    {
        self::send([
            'success' => true,
            'data' => $items,
            'pagination' => [
                'total' => $total,
                'page' => $page,
                'limit' => $limit,
                'pages' => (int)ceil($total / $limit)
            ]
        ], 200);
    }

    public static function methodNotAllowed(array $data): void
    {
        self::send($data, 405);
    }
}