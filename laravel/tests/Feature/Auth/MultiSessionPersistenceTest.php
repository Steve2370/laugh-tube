<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

/**
 * Couvre le correctif du bug de session ("reste connecté mais les actions
 * échouent silencieusement") : AuthController::login() appelait
 * $user->tokens()->delete() à chaque connexion, révoquant silencieusement
 * TOUTES les autres sessions/appareils/onglets de l'utilisateur. Comportement
 * désiré : comme YouTube/TikTok, un utilisateur reste connecté sur chaque
 * appareil jusqu'à une déconnexion explicite de cet appareil.
 */
class MultiSessionPersistenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_logging_in_from_a_second_device_does_not_revoke_the_first_devices_token(): void
    {
        $user = User::factory()->create([
            'password_hash' => Hash::make('correct-password'),
        ]);

        $firstLogin = $this->postJson('/api/v2/login', [
            'email' => $user->email,
            'password' => 'correct-password',
        ])->assertStatus(200);
        $firstToken = $firstLogin->json('token');

        // Deuxième connexion, simulant un autre appareil/onglet.
        $secondLogin = $this->postJson('/api/v2/login', [
            'email' => $user->email,
            'password' => 'correct-password',
        ])->assertStatus(200);
        $secondToken = $secondLogin->json('token');

        $this->assertNotEquals($firstToken, $secondToken);

        // Avant le correctif, ce deuxième appel révoquait $firstToken : la requête
        // suivante avec ce token aurait échoué avec 401.
        $this->withToken($firstToken)
            ->getJson('/api/v2/me')
            ->assertStatus(200)
            ->assertJsonPath('user.id', $user->id);

        $this->withToken($secondToken)
            ->getJson('/api/v2/me')
            ->assertStatus(200)
            ->assertJsonPath('user.id', $user->id);
    }
}
