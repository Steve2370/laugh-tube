<?php

namespace Tests\Feature\Auth;

use App\Interfaces\EmailProviderInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Couvre la faille 1.6 de l'audit du 12/09 : /register n'avait aucun throttle,
 * ce qui permettait le spam de comptes / l'épuisement de ressources.
 */
class RegisterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // register() envoie un email de vérification + un email de bienvenue via
        // EmailProviderInterface (Resend en production) : on remplace par un faux
        // fournisseur pour ne jamais faire de vrai appel réseau pendant les tests.
        $this->app->bind(EmailProviderInterface::class, fn () => new class implements EmailProviderInterface {
            public function sendEmail(string $to, string $subject, string $body, bool $isHtml = true, ?string $replyTo = null): bool
            {
                return true;
            }

            public function getLastError(): ?string
            {
                return null;
            }
        });
    }

    public function test_register_succeeds_with_valid_data(): void
    {
        $response = $this->postJson('/api/v2/register', [
            'username' => 'nouvelutilisateur',
            'email' => 'nouveau@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertStatus(201)->assertJsonStructure(['token', 'user' => ['id', 'username', 'email']]);
        $this->assertDatabaseHas('users', ['email' => 'nouveau@example.com']);
    }

    public function test_register_is_rate_limited_after_too_many_attempts(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v2/register', [
                'username' => "user{$i}",
                'email' => "user{$i}@example.com",
                'password' => 'password123',
                'password_confirmation' => 'password123',
            ])->assertStatus(201);
        }

        $this->postJson('/api/v2/register', [
            'username' => 'userdepasse',
            'email' => 'userdepasse@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertStatus(429);
    }
}
