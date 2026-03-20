<?php

namespace App\Controllers;

use App\Interfaces\DatabaseInterface;
use App\Middleware\AuthMiddleware;
use App\Services\EmailService;
use App\Utils\JsonResponse;
use App\Utils\SecurityHelper;

class ContactController
{
    public function __construct(
        private DatabaseInterface $db,
        private EmailService $emailService
    ) {}

    public function send(): void
    {
        $input = json_decode(file_get_contents('php://input'), true);

        $name    = SecurityHelper::sanitizeInput($input['name']    ?? '');
        $email   = SecurityHelper::sanitizeInput($input['email']   ?? '');
        $subject = SecurityHelper::sanitizeInput($input['subject'] ?? '');
        $message = SecurityHelper::sanitizeInput($input['message'] ?? '');

        if (empty($name) || empty($email) || empty($subject) || empty($message)) {
            JsonResponse::badRequest(['error' => 'Tous les champs sont requis']);
            return;
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            JsonResponse::badRequest(['error' => 'Email invalide']);
            return;
        }
        if (strlen($subject) > 255) {
            JsonResponse::badRequest(['error' => 'Sujet trop long (max 255 caractères)']);
            return;
        }
        if (strlen($message) > 5000) {
            JsonResponse::badRequest(['error' => 'Message trop long (max 5000 caractères)']);
            return;
        }

        $userId = null;
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (!empty($authHeader)) {
            try {
                $user = AuthMiddleware::optionalAuth();
                $userId = $user ? (int)($user['sub'] ?? $user['id'] ?? null) : null;
            } catch (\Throwable $e) {
                $userId = null;
            }
        }

        $this->db->fetchOne(
            "INSERT INTO contact_messages (user_id, name, email, subject, message)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id",
            [$userId, $name, $email, $subject, $message]
        );

        $this->emailService->sendContactNotificationEmail($name, $email, $subject, $message);

        JsonResponse::success(['message' => 'Message envoyé avec succès']);
    }
}