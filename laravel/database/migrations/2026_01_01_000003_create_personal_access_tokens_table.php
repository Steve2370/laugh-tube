<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration de rattrapage : Laravel Sanctum ne charge PAS automatiquement sa
 * migration personal_access_tokens (contrairement à la plupart des packages
 * Laravel) - voir SanctumServiceProvider::boot(), qui ne fait que
 * publishesMigrations() (nécessite un vendor:publish manuel), jamais
 * loadMigrationsFrom(). Cette table n'apparaît nulle part dans
 * docker/postgres/init-database.sql non plus - elle a dû être créée à la
 * main en prod (vendor:publish + migrate exécutés une fois sans que le
 * fichier de migration généré soit commité). Résultat : sur tout
 * environnement neuf (dont les tests), la création de token Sanctum
 * (login, register) plantait avec "no such table: personal_access_tokens".
 * Contenu identique à vendor/laravel/sanctum/database/migrations/
 * 2019_12_14_000001_create_personal_access_tokens_table.php. Idempotente
 * via hasTable() pour ne rien faire si la table existe déjà en prod.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('personal_access_tokens')) {
            return;
        }

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->text('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        // Volontairement vide : ce nettoyage de schéma ne doit pas être annulable
        // automatiquement en production.
    }
};
