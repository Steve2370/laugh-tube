<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

/**
 * Couvre la faille 1.1 de l'audit du 12/09 : AuthController::login() délivrait
 * un token complet sans jamais vérifier two_fa_enabled, contournant
 * totalement la 2FA sur le login classique (seul le callback Google la
 * respectait). Couvre aussi le rate limiting du login (faille 1.6) et
 * vérifie que le gestionnaire d'exceptions durci (faille 1.4) ne transforme
 * pas une erreur de connexion normale en fausse erreur 500.
 */
class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_succeeds_without_two_factor(): void
    {
        $user = User::factory()->create([
            'password_hash' => Hash::make('correct-password'),
        ]);

        $response = $this->postJson('/api/v2/login', [
            'email' => $user->email,
            'password' => 'correct-password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['token', 'user' => ['id', 'username', 'email', 'role']])
            ->assertJsonMissing(['requires_2fa' => true]);
    }

    public function test_login_with_two_factor_enabled_returns_temp_token_instead_of_full_token(): void
    {
        $user = User::factory()->withTwoFactor()->create([
            'password_hash' => Hash::make('correct-password'),
        ]);

        $response = $this->postJson('/api/v2/login', [
            'email' => $user->email,
            'password' => 'correct-password',
        ]);

        // Avant le correctif, cette réponse contenait directement un "token"
        // complet : la 2FA était donc entièrement contournable au login.
        $response->assertStatus(200)
            ->assertJson(['requires_2fa' => true, 'user_id' => $user->id])
            ->assertJsonStructure(['temp_token'])
            ->assertJsonMissingPath('token');
    }

    public function test_two_factor_login_flow_completes_successfully_with_valid_code(): void
    {
        $secret = 'JBSWY3DPEHPK3PXP';
        $user = User::factory()->withTwoFactor($secret)->create([
            'password_hash' => Hash::make('correct-password'),
        ]);

        $login = $this->postJson('/api/v2/login', [
            'email' => $user->email,
            'password' => 'correct-password',
        ])->assertStatus(200);

        $tempToken = $login->json('temp_token');
        $this->assertNotEmpty($tempToken);

        $code = (new Google2FA())->getCurrentOtp($secret);

        $verify = $this->postJson('/api/v2/auth/2fa/verify-login', [
            'user_id' => $user->id,
            'code' => $code,
            'temp_token' => $tempToken,
        ]);

        $verify->assertStatus(200)->assertJsonStructure(['token', 'user' => ['id']]);
    }

    public function test_login_fails_with_wrong_password_and_is_not_masked_as_a_server_error(): void
    {
        // Vérifie que le durcissement du gestionnaire d'exceptions (bootstrap/app.php,
        // faille 1.4) ne transforme pas une ValidationException (422, message métier
        // volontaire) en fausse erreur 500 "Une erreur interne est survenue" — ce
        // qu'il faisait avant correction, ValidationException n'ayant pas de
        // getStatusCode().
        config(['app.debug' => false]);

        $user = User::factory()->create([
            'password_hash' => Hash::make('correct-password'),
        ]);

        $response = $this->postJson('/api/v2/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422);
        $this->assertStringNotContainsString('erreur interne', strtolower($response->getContent()));
    }

    public function test_login_is_rate_limited_after_too_many_attempts(): void
    {
        // Faille 1.6 de l'audit du 12/09 : /login n'avait aucun throttle.
        $user = User::factory()->create([
            'password_hash' => Hash::make('correct-password'),
        ]);

        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/v2/login', [
                'email' => $user->email,
                'password' => 'wrong-password',
            ])->assertStatus(422);
        }

        $this->postJson('/api/v2/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ])->assertStatus(429);
    }
}
