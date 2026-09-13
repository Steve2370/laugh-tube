<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Couvre la faille 1.5 de l'audit du 12/09 : TwoFactorController::disable()
 * ne vérifiait le mot de passe que s'il était fourni — une requête authentifiée
 * sans champ "password" désactivait donc la 2FA sans aucune vérification.
 */
class TwoFactorTest extends TestCase
{
    use RefreshDatabase;

    public function test_disable_two_factor_requires_password(): void
    {
        $user = User::factory()->withTwoFactor()->create([
            'password_hash' => Hash::make('correct-password'),
        ]);
        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/v2/auth/2fa/disable', []);

        $response->assertStatus(422);
        $this->assertTrue($user->fresh()->two_fa_enabled);
    }

    public function test_disable_two_factor_rejects_wrong_password(): void
    {
        $user = User::factory()->withTwoFactor()->create([
            'password_hash' => Hash::make('correct-password'),
        ]);
        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/v2/auth/2fa/disable', [
            'password' => 'mauvais-mot-de-passe',
        ]);

        $response->assertStatus(400);
        $this->assertTrue($user->fresh()->two_fa_enabled);
    }

    public function test_disable_two_factor_succeeds_with_correct_password(): void
    {
        $user = User::factory()->withTwoFactor()->create([
            'password_hash' => Hash::make('correct-password'),
        ]);
        Sanctum::actingAs($user, ['*']);

        $response = $this->postJson('/api/v2/auth/2fa/disable', [
            'password' => 'correct-password',
        ]);

        $response->assertStatus(200);
        $fresh = $user->fresh();
        $this->assertFalse($fresh->two_fa_enabled);
        $this->assertNull($fresh->two_fa_secret);
    }
}
