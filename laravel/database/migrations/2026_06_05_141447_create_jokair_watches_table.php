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
        Schema::create('jokair_watches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entry_id')->constrained('jokair_entries')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('session_id')->nullable();
            $table->integer('seconds_watched');
            $table->integer('video_duration');
            $table->timestamp('watched_at')->useCurrent();
            $table->unique(['entry_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jokair_watches');
    }
};
