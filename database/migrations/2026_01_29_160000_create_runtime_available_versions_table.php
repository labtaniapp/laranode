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
        Schema::create('runtime_available_versions', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // php, nodejs
            $table->string('version'); // 8.4, 22, etc.
            $table->string('label')->nullable(); // PHP 8.4 (Latest), Node.js 20 LTS
            $table->boolean('is_lts')->default(false);
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['type', 'version']);
            $table->index(['type', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('runtime_available_versions');
    }
};
