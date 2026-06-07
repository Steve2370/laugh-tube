<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jokair_entries', function (Blueprint $table) {
            $table->boolean('validated')->default(false)->after('rank');
            $table->text('rejected_reason')->nullable()->after('validated');
        });
    }

    public function down(): void
    {
        Schema::table('jokair_entries', function (Blueprint $table) {
            $table->dropColumn(['validated', 'rejected_reason']);
        });
    }
};
