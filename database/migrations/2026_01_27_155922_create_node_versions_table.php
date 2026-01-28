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
        Schema::create('node_versions', function (Blueprint $table) {
            $table->id();
            $table->string('version'); // e.g., "18", "20", "22"
            $table->string('full_version')->nullable(); // e.g., "18.19.0"
            $table->string('binary_path')->nullable(); // e.g., "/usr/bin/node"
            $table->boolean('active')->default(true);
            $table->boolean('is_default')->default(false);
            $table->timestamps();

            $table->unique('version');
        });

        // Seed default Node.js version
        DB::table('node_versions')->insert([
            'version' => '22',
            'full_version' => '22.x',
            'binary_path' => '/usr/bin/node',
            'active' => true,
            'is_default' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('node_versions');
    }
};
