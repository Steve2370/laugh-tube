<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('jokair_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contest_id')->constrained('jokair_contests')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('video_id')->constrained('videos')->cascadeOnDelete();
            $table->integer('vote_count')->default(0);
            $table->integer('watch_seconds_total')->default(0);
            $table->integer('watch_count')->default(0);
            $table->decimal('score', 8, 4)->default(0);
            $table->integer('rank')->nullable();
            $table->timestamps();
            $table->unique(['contest_id', 'user_id']);
            $table->unique(['contest_id', 'video_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jokair_entries');
    }
};
