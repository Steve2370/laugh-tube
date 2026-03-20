<?php

namespace App\Controllers;

use App\Interfaces\DatabaseInterface;
use App\Middleware\AdminMiddleware;
use App\Services\EmailService;
use App\Utils\JsonResponse;
use App\Utils\SecurityHelper;

class AdminMessagesController
{
    public function __construct(
        private DatabaseInterface $db,
        private AdminMiddleware $adminMiddleware,
        private EmailService $emailService
    ) {}

    public function getMessages(): void
    {
        $adminUser = $this->adminMiddleware->handle();
        if (!$adminUser) return;

        $messages = $this->db->fetchAll(
            "SELECT
                am.id,
                am.subject,
                am.message,
                am.sent_at,
                u.id AS user_id,
                u.username AS user_username,
                u.email AS user_email,
                a.username AS admin_username
             FROM admin_messages am
             JOIN users u ON u.id = am.user_id
             JOIN users a ON a.id = am.admin_id
             ORDER BY am.sent_at DESC
             LIMIT 200",
            []
        );

        JsonResponse::success(['messages' => $messages ?? []]);
    }

    public function sendMessage(): void
    {
        $adminUser = $this->adminMiddleware->handle();
        if (!$adminUser) return;

        $input = json_decode(file_get_contents('php://input'), true);

        $userId  = (int)($input['user_id']  ?? 0);
        $subject = SecurityHelper::sanitizeInput($input['subject'] ?? '');
        $message = SecurityHelper::sanitizeInput($input['message'] ?? '');

        if (!$userId || empty($subject) || empty($message)) {
            JsonResponse::badRequest(['error' => 'user_id, subject et message sont requis']);
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

        $user = $this->db->fetchOne(
            "SELECT id, username, email FROM users WHERE id = $1 AND deleted_at IS NULL",
            [$userId]
        );

        if (!$user) {
            JsonResponse::notFound(['error' => 'Utilisateur introuvable']);
            return;
        }

        $adminId = (int)($adminUser['id'] ?? $adminUser['sub'] ?? 0);

        $this->db->fetchOne(
            "INSERT INTO admin_messages (admin_id, user_id, subject, message)
             VALUES ($1, $2, $3, $4)
             RETURNING id",
            [$adminId, $userId, $subject, $message]
        );

        $sent = $this->emailService->sendAdminMessageEmail(
            $userId,
            $user['email'],
            $user['username'],
            $subject,
            $message
        );

        if (!$sent) {
            JsonResponse::json(['error' => 'Message sauvegardé mais erreur lors de l\'envoi email'], 500);
            return;
        }

        JsonResponse::success(['message' => 'Message envoyé avec succès']);
    }

    public function getInbox(): void
    {
        $adminUser = $this->adminMiddleware->handle();
        if (!$adminUser) return;
        $inbox = $this->db->fetchAll(
            "SELECT cm.*, u.username
         FROM contact_messages cm
         LEFT JOIN users u ON u.id = cm.user_id
         ORDER BY cm.sent_at DESC LIMIT 200", []
        );
        JsonResponse::success(['inbox' => $inbox ?? []]);
    }

    public function updateInbox(int $msgId): void
    {
        $adminUser = $this->adminMiddleware->handle();
        if (!$adminUser) return;
        $input  = json_decode(file_get_contents('php://input'), true);
        $statut = $input['statut'] ?? 'read';
        $this->db->fetchOne(
            "UPDATE contact_messages SET statut = $1 WHERE id = $2 RETURNING id",
            [$statut, $msgId]
        );
        JsonResponse::success(['message' => 'Statut mis à jour']);
    }
}