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
        Schema::create('cron_jobs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->constrained('websites')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('name')->nullable(); // Optional name/description
            $table->string('minute')->default('*');
            $table->string('hour')->default('*');
            $table->string('day')->default('*');
            $table->string('month')->default('*');
            $table->string('weekday')->default('*');
            $table->text('command');
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_run_at')->nullable();
            $table->text('last_output')->nullable();
            $table->timestamps();

            $table->index(['website_id', 'is_active']);
            $table->index('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cron_jobs');
    }
};
