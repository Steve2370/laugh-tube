<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Complément à 2026_09_04_000000_sync_users_videos_columns.php : bio,
     * avatar_url et cover_url sont dans $fillable de App\Models\User et déjà
     * utilisées en production (ajoutées à la main via init-database.sql), mais
     * n'existaient dans AUCUNE migration Laravel. Conséquence concrète : un
     * environnement reconstruit depuis les migrations (CI, tests PHPUnit sur
     * SQLite, nouvel environnement de dev) n'a pas ces colonnes, et toute
     * requête Eloquent qui les touche échoue avec « no such column ». Migration
     * additive et idempotente, comme sa précédente, pour ne rien casser en
     * production si elle est rejouée sur une base qui les a déjà.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'bio'))        $table->text('bio')->nullable();
            if (!Schema::hasColumn('users', 'avatar_url')) $table->string('avatar_url')->nullable();
            if (!Schema::hasColumn('users', 'cover_url'))  $table->string('cover_url')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Volontairement vide, comme la migration soeur : ne jamais supprimer
        // de colonnes utilisateur en production via un rollback automatique.
    }
};
