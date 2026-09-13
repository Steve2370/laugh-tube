<?php

namespace Tests\Feature\Webhooks;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Couvre la faille 1.3 de l'audit du 12/09 : le webhook entrant Resend était
 * public et n'authentifiait jamais l'appelant — n'importe qui pouvait injecter
 * de faux messages dans contact_messages ou forcer le serveur à interroger
 * l'API Resend avec sa clé via un email_id arbitraire.
 */
class ResendWebhookTest extends TestCase
{
    use RefreshDatabase;

    private function signedHeaders(string $body, string $secret, ?int $timestamp = null): array
    {
        $timestamp ??= time();
        $id = 'msg_test123';
        $secretBytes = base64_decode(preg_replace('/^whsec_/', '', $secret));
        $signature = base64_encode(hash_hmac('sha256', "{$id}.{$timestamp}.{$body}", $secretBytes, true));

        return [
            'svix-id' => $id,
            'svix-timestamp' => (string) $timestamp,
            'svix-signature' => "v1,{$signature}",
        ];
    }

    public function test_webhook_is_rejected_when_secret_is_not_configured(): void
    {
        config(['services.resend.webhook_secret' => null]);

        $body = json_encode(['type' => 'email.received', 'data' => []]);

        $response = $this->call('POST', '/api/v2/webhooks/resend-inbound', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], $body);

        $response->assertStatus(401);
    }

    public function test_webhook_is_rejected_with_invalid_signature(): void
    {
        config(['services.resend.webhook_secret' => 'whsec_dGVzdHNlY3JldA==']);

        $body = json_encode(['type' => 'email.received', 'data' => []]);

        $response = $this->call('POST', '/api/v2/webhooks/resend-inbound', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_SVIX_ID' => 'msg_test123',
            'HTTP_SVIX_TIMESTAMP' => (string) time(),
            'HTTP_SVIX_SIGNATURE' => 'v1,signature-invalide',
        ], $body);

        $response->assertStatus(401);
    }

    public function test_webhook_is_accepted_with_a_valid_signature_and_stores_the_message(): void
    {
        $secret = 'whsec_dGVzdHNlY3JldA==';
        config(['services.resend.webhook_secret' => $secret]);

        $body = json_encode([
            'type' => 'email.received',
            'data' => [
                'from' => 'Jean Testeur <jean@example.com>',
                'to' => ['legal@laughtube.ca'],
                'subject' => 'Question légale',
                'email_id' => null,
            ],
        ]);

        $headers = $this->signedHeaders($body, $secret);
        $serverHeaders = ['CONTENT_TYPE' => 'application/json'];
        foreach ($headers as $key => $value) {
            $serverHeaders['HTTP_' . strtoupper(str_replace('-', '_', $key))] = $value;
        }

        $response = $this->call('POST', '/api/v2/webhooks/resend-inbound', [], [], [], $serverHeaders, $body);

        $response->assertStatus(200);
        $this->assertDatabaseHas('contact_messages', [
            'email' => 'jean@example.com',
            'subject' => 'Question légale',
        ]);
    }
}
