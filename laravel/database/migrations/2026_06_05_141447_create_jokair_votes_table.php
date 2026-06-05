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
        Schema::create('jokair_votes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('entry_id')->constrained('jokair_entries')->cascadeOnDelete();
            $table->foreignId('voter_id')->constrained('users')->cascadeOnDelete();
            $table->timestamp('voted_at')->useCurrent();
            $table->unique(['entry_id', 'voter_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jokair_votes');
    }
};
