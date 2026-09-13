<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * La table videos n'existait dans AUCUNE migration Laravel — elle n'a
     * toujours été créée qu'à la main via docker/postgres/init-database.sql.
     * Conséquence concrète, découverte en essayant d'écrire des tests Feature
     * avec RefreshDatabase (voir audit du 12/09, tests de non-régression sur
     * les correctifs) : "php artisan migrate" sur un environnement neuf (CI,
     * SQLite de test, nouveau serveur) plantait dès
     * 2026_09_04_000000_sync_users_videos_columns.php (qui ne fait qu'un ALTER
     * TABLE et suppose la table déjà existante), et jokair_entries ne pouvait
     * pas non plus créer sa clé étrangère vers videos. Datée avant les
     * migrations jokair pour que l'ordre d'exécution reste correct. Idempotente
     * (hasTable) pour ne rien faire en production, où la table existe déjà.
     */
    public function up(): void
    {
        if (Schema::hasTable('videos')) {
            return;
        }

        Schema::create('videos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('filename')->nullable();
            $table->string('encoded_filename')->nullable();
            $table->string('thumbnail')->nullable();
            $table->integer('duration')->nullable();
            $table->unsignedBigInteger('views')->default(0);
            $table->string('status', 20)->default('published');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Volontairement vide : ne jamais supprimer la table videos en
        // production via un rollback de migration.
    }
};
