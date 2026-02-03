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
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action'); // create, update, delete, login, logout, etc.
            $table->string('category'); // auth, website, database, user, email, security, system
            $table->string('subject_type')->nullable(); // Model class name
            $table->unsignedBigInteger('subject_id')->nullable(); // Model ID
            $table->string('description');
            $table->json('properties')->nullable(); // Additional data (old values, new values, etc.)
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->string('severity')->default('info'); // info, warning, error, critical
            $table->timestamps();

            $table->index(['user_id', 'created_at']);
            $table->index(['category', 'created_at']);
            $table->index(['action', 'created_at']);
            $table->index(['severity', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
