<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Migration additive « de rattrapage » : fait passer par une vraie migration
     * Laravel les colonnes qui avaient été ajoutées à la main via des ALTER TABLE
     * accumulés dans docker/postgres/init-database.sql (voir rapport d'audit,
     * parties 1.2.b / 1.3.b / 3.3). Toutes les opérations sont protégées par
     * hasColumn() pour rester idempotentes, quel que soit l'état réel de la base.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'email_verified'))            $table->boolean('email_verified')->default(false);
            if (!Schema::hasColumn('users', 'verification_token'))        $table->string('verification_token', 64)->nullable();
            if (!Schema::hasColumn('users', 'verification_token_expires')) $table->timestamp('verification_token_expires')->nullable();
            if (!Schema::hasColumn('users', 'two_fa_secret'))             $table->string('two_fa_secret', 64)->nullable();
            if (!Schema::hasColumn('users', 'two_fa_enabled'))            $table->boolean('two_fa_enabled')->default(false);
            if (!Schema::hasColumn('users', 'deleted_at'))                $table->timestamp('deleted_at')->nullable();
            if (!Schema::hasColumn('users', 'deletion_scheduled_at'))     $table->timestamp('deletion_scheduled_at')->nullable();
            if (!Schema::hasColumn('users', 'deletion_reason'))           $table->text('deletion_reason')->nullable();
            if (!Schema::hasColumn('users', 'last_login'))                $table->timestamp('last_login')->nullable();
            if (!Schema::hasColumn('users', 'failed_login_attempts'))     $table->integer('failed_login_attempts')->default(0);
            if (!Schema::hasColumn('users', 'account_locked_until'))      $table->timestamp('account_locked_until')->nullable();
            if (!Schema::hasColumn('users', 'password_changed_at'))       $table->timestamp('password_changed_at')->nullable();
            if (!Schema::hasColumn('users', 'ip_registration'))           $table->string('ip_registration', 45)->nullable();
            if (!Schema::hasColumn('users', 'password_reset_token'))      $table->string('password_reset_token', 64)->nullable();
            if (!Schema::hasColumn('users', 'password_reset_expires_at')) $table->timestamp('password_reset_expires_at')->nullable();
            if (!Schema::hasColumn('users', 'user_agent_registration'))   $table->text('user_agent_registration')->nullable();
            if (!Schema::hasColumn('users', 'is_admin'))                  $table->boolean('is_admin')->default(false);
            if (!Schema::hasColumn('users', 'google_id'))                 $table->string('google_id')->nullable();
        });

        Schema::table('videos', function (Blueprint $table) {
            if (!Schema::hasColumn('videos', 'encoded_filename')) $table->string('encoded_filename')->nullable();
            if (!Schema::hasColumn('videos', 'deleted_at'))       $table->timestamp('deleted_at')->nullable();
        });

        Schema::table('encoding_queue', function (Blueprint $table) {
            if (!Schema::hasColumn('encoding_queue', 'priority'))      $table->integer('priority')->default(0);
            if (!Schema::hasColumn('encoding_queue', 'started_at'))    $table->timestamp('started_at')->nullable();
            if (!Schema::hasColumn('encoding_queue', 'completed_at'))  $table->timestamp('completed_at')->nullable();
            if (!Schema::hasColumn('encoding_queue', 'updated_at'))    $table->timestamp('updated_at')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Volontairement vide : ce nettoyage de schéma ne doit pas être annulable
        // automatiquement en production.
    }
};
