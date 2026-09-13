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
        // Faille 1.3 de l'audit du 12/09 : cette route était publique et n'authentifiait
        // jamais l'appelant — n'importe qui pouvait injecter de faux messages dans
        // contact_messages ou forcer le serveur à interroger l'API Resend avec sa clé
        // via un email_id arbitraire. Resend signe ses webhooks au format Svix
        // (svix-id / svix-timestamp / svix-signature) : on vérifie cette signature
        // avant de traiter quoi que ce soit.
        if (!$this->hasValidSignature($request)) {
            Log::warning('ResendInboundController: signature Svix invalide ou absente', [
                'ip' => $request->ip(),
            ]);
            return response()->json(['error' => 'Signature invalide'], 401);
        }

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

    /**
     * Vérifie la signature Svix d'un webhook Resend.
     * https://resend.com/docs/dashboard/webhooks/verify-webhooks-requests
     */
    private function hasValidSignature(Request $request): bool
    {
        $secret = config('services.resend.webhook_secret');

        // Repli fermé : si le secret n'est pas configuré, on refuse tout plutôt que
        // d'accepter des webhooks non vérifiés (voir aussi faille 2.3 du même audit :
        // ne jamais désactiver silencieusement une protection par défaut).
        if (!$secret) {
            Log::error('ResendInboundController: RESEND_WEBHOOK_SECRET non configuré, webhook refusé.');
            return false;
        }

        $svixId = $request->header('svix-id');
        $svixTimestamp = $request->header('svix-timestamp');
        $svixSignature = $request->header('svix-signature');

        if (!$svixId || !$svixTimestamp || !$svixSignature) {
            return false;
        }

        // Anti-rejeu : refuse un timestamp de plus de 5 minutes d'écart.
        if (abs(time() - (int) $svixTimestamp) > 300) {
            return false;
        }

        $secretBytes = base64_decode(preg_replace('/^whsec_/', '', $secret));
        $signedContent = "{$svixId}.{$svixTimestamp}.{$request->getContent()}";
        $expected = base64_encode(hash_hmac('sha256', $signedContent, $secretBytes, true));

        foreach (explode(' ', $svixSignature) as $part) {
            [$version, $signature] = array_pad(explode(',', $part, 2), 2, null);
            if ($version === 'v1' && $signature && hash_equals($expected, $signature)) {
                return true;
            }
        }

        return false;
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
