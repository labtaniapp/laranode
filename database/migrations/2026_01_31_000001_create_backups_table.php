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
        Schema::create('backups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('name');
            $table->string('filename');
            $table->string('path');
            $table->enum('storage', ['local', 's3', 'ftp'])->default('local');
            $table->bigInteger('size')->default(0); // in bytes
            $table->boolean('includes_files')->default(true);
            $table->boolean('includes_database')->default(true);
            $table->enum('status', ['pending', 'in_progress', 'completed', 'failed'])->default('pending');
            $table->text('error_message')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['website_id', 'status']);
            $table->index(['user_id', 'created_at']);
        });

        Schema::create('backup_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->boolean('auto_backup_enabled')->default(false);
            $table->enum('frequency', ['daily', 'weekly', 'monthly'])->default('daily');
            $table->integer('retention_days')->default(7);
            $table->enum('storage', ['local', 's3'])->default('local');
            $table->string('s3_bucket')->nullable();
            $table->string('s3_region')->nullable();
            $table->string('s3_endpoint')->nullable(); // Custom endpoint for R2, Wasabi, etc.
            $table->string('s3_access_key')->nullable();
            $table->text('s3_secret_key')->nullable(); // encrypted
            $table->string('s3_path')->nullable();
            $table->timestamps();

            $table->unique('user_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('backup_settings');
        Schema::dropIfExists('backups');
    }
};
