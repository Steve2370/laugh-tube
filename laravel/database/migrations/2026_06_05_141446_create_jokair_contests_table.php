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
        Schema::create('jokair_contests', function (Blueprint $table) {
            $table->id();
            $table->string('edition')->unique();
            $table->string('titre');
            $table->timestamp('submission_start');
            $table->timestamp('submission_end');
            $table->timestamp('vote_start');
            $table->timestamp('vote_end');
            $table->enum('status', ['upcoming', 'submissions', 'voting', 'ended'])->default('upcoming');
            $table->integer('prize_1')->default(200);
            $table->integer('prize_2')->default(75);
            $table->integer('prize_3')->default(25);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jokair_contests');
    }
};
