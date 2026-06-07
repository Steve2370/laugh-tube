<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jokair_contests', function (Blueprint $table) {
            $table->date('results_date')->nullable()->after('vote_end');
        });
    }

    public function down(): void
    {
        Schema::table('jokair_contests', function (Blueprint $table) {
            $table->dropColumn('results_date');
        });
    }
};
