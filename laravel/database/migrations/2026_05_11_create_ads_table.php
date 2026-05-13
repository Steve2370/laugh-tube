<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('ads', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('video_url', 500);
            $table->string('redirect_url', 500);
            $table->string('advertiser_name')->default('LaughTube');
            $table->integer('skip_after_seconds')->default(5);
            $table->boolean('is_active')->default(true);
            $table->integer('impressions')->default(0);
            $table->integer('clicks')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('ads');
    }
};
