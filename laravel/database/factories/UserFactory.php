<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 *
 * Corrigée le 13/09/2026 : la factory générée par le scaffolding par défaut de
 * Laravel (name / password / remember_token / email_verified_at) ne correspond
 * pas au schéma réel de la table users (username / password_hash / role /
 * email_verified, voir App\Models\User::$fillable) — User::factory()->create()
 * échouait purement et simplement. Nécessaire pour pouvoir écrire des tests
 * Feature couvrant les correctifs de l'audit du 12/09.
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'username' => fake()->unique()->userName(),
            'email' => fake()->unique()->safeEmail(),
            'password_hash' => static::$password ??= Hash::make('password'),
            'role' => 'membre',
            'email_verified' => true,
            'two_fa_enabled' => false,
            'two_fa_secret' => null,
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified' => false,
        ]);
    }

    /**
     * Indicate that the user has 2FA (Google Authenticator / TOTP) enabled.
     */
    public function withTwoFactor(?string $secret = null): static
    {
        return $this->state(fn (array $attributes) => [
            'two_fa_enabled' => true,
            // Secret TOTP valide (base32) utilisable directement par pragmarx/google2fa
            // dans les tests, ex. pour générer un code avec Google2FA::getCurrentOtp().
            'two_fa_secret' => $secret ?? 'JBSWY3DPEHPK3PXP',
        ]);
    }

    /**
     * Indicate that the user is an admin.
     */
    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'role' => 'admin',
        ]);
    }
}
