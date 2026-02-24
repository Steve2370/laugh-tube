<?php

namespace App\Controllers;

use App\Interfaces\DatabaseInterface;
use App\Utils\JsonResponse;
use App\Utils\SecurityHelper;

class ResendInboundWebhook
{
    public function __construct(
        private DatabaseInterface $db
    ) {}

    public function handle(): void
    {
        $payload = file_get_contents('php://input');
        $event   = json_decode($payload, true);

        if (!$event || ($event['type'] ?? '') !== 'email.received') {
            JsonResponse::success(['ok' => true]);
            return;
        }

        $data    = $event['data'] ?? [];
        $from    = $data['from']    ?? '';
        $subject = $data['subject'] ?? '(sans sujet)';
        $to      = is_array($data['to']) ? implode(', ', $data['to']) : ($data['to'] ?? '');

        $toLower = strtolower($to);
        if (!str_contains($toLower, 'legal@laughtube.ca') && !str_contains($toLower, 'legal@')) {
            JsonResponse::success(['ok' => true, 'skipped' => true]);
            return;
        }

        $senderName  = $from;
        $senderEmail = $from;
        if (preg_match('/^(.+?)\s*<(.+?)>$/', $from, $matches)) {
            $senderName  = trim($matches[1]);
            $senderEmail = trim($matches[2]);
        }

        $senderName  = SecurityHelper::sanitizeInput($senderName  ?: $senderEmail);
        $senderEmail = SecurityHelper::sanitizeInput($senderEmail);
        $subject     = SecurityHelper::sanitizeInput($subject);

        $message = $this->fetchEmailBody($data['email_id'] ?? null);
        if (!$message) {
            $message = '(Corps du message non disponible — voir Resend dashboard)';
        }

        $userId = null;
        if (filter_var($senderEmail, FILTER_VALIDATE_EMAIL)) {
            $user = $this->db->fetchOne(
                "SELECT id FROM users WHERE email = $1 AND deleted_at IS NULL",
                [$senderEmail]
            );
            $userId = $user ? (int)$user['id'] : null;
        }

        $this->db->fetchOne(
            "INSERT INTO contact_messages (user_id, name, email, subject, message, statut)
             VALUES ($1, $2, $3, $4, $5, 'unread')
             RETURNING id",
            [$userId, $senderName, $senderEmail, $subject, $message]
        );

        JsonResponse::success(['ok' => true]);
    }

    private function fetchEmailBody(?string $emailId): ?string
    {
        if (!$emailId) return null;

        $apiKey = $_ENV['RESEND_API_KEY'] ?? getenv('RESEND_API_KEY') ?? '';
        if (!$apiKey) return null;

        $ch = curl_init("https://api.resend.com/emails/{$emailId}");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer {$apiKey}",
                "Content-Type: application/json",
            ],
        ]);
        $response = curl_exec($ch);
        curl_close($ch);

        if (!$response) return null;
        $data = json_decode($response, true);

        if (!empty($data['text'])) return $data['text'];
        if (!empty($data['html'])) return strip_tags($data['html']);

        return null;
    }
}