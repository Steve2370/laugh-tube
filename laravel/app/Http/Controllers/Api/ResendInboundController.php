<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ResendInboundController extends Controller
{
    public function handle(Request $request): JsonResponse
    {
        $event = $request->json()->all();

        if (($event['type'] ?? '') !== 'email.received') {
            return response()->json(['ok' => true]);
        }

        $data = $event['data'] ?? [];
        $from = $data['from'] ?? '';
        $subject = $data['subject'] ?? '(sans sujet)';
        $to = is_array($data['to'] ?? null) ? implode(', ', $data['to']) : ($data['to'] ?? '');

        $toLower = strtolower($to);
        if (!str_contains($toLower, 'legal@laughtube.ca') && !str_contains($toLower, 'legal@')) {
            return response()->json(['ok' => true, 'skipped' => true]);
        }

        $senderName = $from;
        $senderEmail = $from;
        if (preg_match('/^(.+?)\s*<(.+?)>$/', $from, $matches)) {
            $senderName = trim($matches[1]);
            $senderEmail = trim($matches[2]);
        }

        $senderName = $this->sanitize($senderName ?: $senderEmail);
        $senderEmail = $this->sanitize($senderEmail);
        $subject = $this->sanitize($subject);

        $message = $this->fetchEmailBody($data['email_id'] ?? null)
            ?? '(Corps du message non disponible — voir Resend dashboard)';

        $userId = null;
        if (filter_var($senderEmail, FILTER_VALIDATE_EMAIL)) {
            $userId = User::whereNull('deleted_at')->where('email', $senderEmail)->value('id');
        }

        DB::table('contact_messages')->insert([
            'user_id' => $userId,
            'name' => $senderName,
            'email' => $senderEmail,
            'subject' => $subject,
            'message' => $message,
            'statut' => 'unread',
            'sent_at' => now(),
        ]);

        return response()->json(['ok' => true]);
    }

    private function sanitize(string $value): string
    {
        $clean = strip_tags($value);
        $clean = htmlspecialchars($clean, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return str_replace(["\0", "\x00"], '', $clean);
    }

    private function fetchEmailBody(?string $emailId): ?string
    {
        if (!$emailId) {
            return null;
        }

        $apiKey = config('services.resend.key');
        if (!$apiKey) {
            return null;
        }

        try {
            $response = Http::withToken($apiKey)->get("https://api.resend.com/emails/{$emailId}");
        } catch (\Exception $e) {
            Log::error('ResendInboundController::fetchEmailBody failed: ' . $e->getMessage());
            return null;
        }

        if (!$response->successful()) {
            return null;
        }

        $data = $response->json();

        if (!empty($data['text'])) {
            return $data['text'];
        }
        if (!empty($data['html'])) {
            return strip_tags($data['html']);
        }

        return null;
    }
}
