<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * Couvre la faille 2.2 de l'audit du 12/09 côté Laravel :
 * ProfileController::deleteAccount() ne demandait aucune réauthentification
 * (un token volé suffisait) et faisait un DELETE SQL immédiat et irréversible,
 * incohérent avec le reste de l'app qui utilise un soft delete partout
 * ailleurs (SoftDeletes sur User).
 *
 * Note : le frontend appelle en réalité l'endpoint legacy /auth/delete-account
 * (backend/), corrigé séparément dans AuthService::deleteAccount() — cet
 * endpoint Laravel est corrigé par cohérence/défense en profondeur, mais n'a
 * pas d'appelant actif côté frontend au moment de cet audit.
 */
class AccountDeletionTest extends TestCase
{
    use RefreshDatabase;

    public function test_delete_account_requires_password(): void
    {
        $user = User::factory()->create(['password_hash' => Hash::make('correct-password')]);
        Sanctum::actingAs($user, ['*']);

        $this->deleteJson('/api/v2/users/me', [])->assertStatus(422);
        $this->assertNull($user->fresh()->deleted_at);
    }

    public function test_delete_account_rejects_wrong_password(): void
    {
        $user = User::factory()->create(['password_hash' => Hash::make('correct-password')]);
        Sanctum::actingAs($user, ['*']);

        $this->deleteJson('/api/v2/users/me', ['password' => 'mauvais-mot-de-passe'])
            ->assertStatus(400);
        $this->assertNull($user->fresh()->deleted_at);
    }

    public function test_delete_account_soft_deletes_with_correct_password(): void
    {
        $user = User::factory()->create(['password_hash' => Hash::make('correct-password')]);
        $token = $user->createToken('auth_token')->plainTextToken;
        Sanctum::actingAs($user, ['*']);

        $this->deleteJson('/api/v2/users/me', ['password' => 'correct-password'])
            ->assertStatus(200);

        // Soft delete (SoftDeletes), jamais un DELETE SQL immédiat : la ligne
        // doit toujours exister en base, marquée supprimée.
        $this->assertSoftDeleted('users', ['id' => $user->id]);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }
}
