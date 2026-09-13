<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration de rattrapage : la table encoding_queue existe en production
 * uniquement via docker/postgres/init-database.sql (CREATE TABLE IF NOT
 * EXISTS encoding_queue ...), donc aucune migration Laravel ne la crée.
 * Sur un environnement neuf (SQLite en mémoire pour les tests, ou toute
 * base fraîche), `php artisan migrate` plantait dès
 * 2026_09_04_000000_sync_users_videos_columns.php qui fait un
 * Schema::table('encoding_queue', ...) (ALTER, suppose la table déjà là).
 * Idempotente via hasTable() pour ne rien casser sur une base existante.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('encoding_queue')) {
            return;
        }

        Schema::create('encoding_queue', function (Blueprint $table) {
            $table->id();
            $table->foreignId('video_id')->constrained('videos')->cascadeOnDelete();
            $table->string('status', 20)->default('pending');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        // Volontairement vide : ce nettoyage de schéma ne doit pas être annulable
        // automatiquement en production.
    }
};
