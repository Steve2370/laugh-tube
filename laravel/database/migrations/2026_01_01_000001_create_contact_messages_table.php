<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Même situation que videos (voir 2026_01_01_000000_create_videos_table.php) :
     * contact_messages est utilisée par ContactController, AdminController et
     * ResendInboundController (dont la vérification de signature Svix, faille
     * 1.3 de l'audit du 12/09) mais n'existait dans aucune migration Laravel.
     * Idempotente : ne fait rien en production, où la table existe déjà.
     */
    public function up(): void
    {
        if (Schema::hasTable('contact_messages')) {
            return;
        }

        Schema::create('contact_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('email');
            $table->string('subject');
            $table->text('message');
            $table->string('statut', 20)->default('unread');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Volontairement vide, comme les autres migrations de rattrapage.
    }
};
