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
        Schema::create('ip_restrictions', function (Blueprint $table) {
            $table->id();
            $table->string('ip_address', 45); // IPv4 or IPv6
            $table->string('type'); // whitelist, blacklist
            $table->string('scope')->default('global'); // global, admin, login
            $table->string('reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('expires_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['ip_address', 'type', 'is_active']);
            $table->index(['scope', 'is_active']);
        });

        // Table for tracking blocked attempts
        Schema::create('ip_block_logs', function (Blueprint $table) {
            $table->id();
            $table->string('ip_address', 45);
            $table->string('reason');
            $table->string('url')->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamps();

            $table->index(['ip_address', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ip_block_logs');
        Schema::dropIfExists('ip_restrictions');
    }
};
