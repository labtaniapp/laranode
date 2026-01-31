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
        Schema::create('supervisor_workers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->constrained()->onDelete('cascade');
            $table->string('name'); // Worker name (e.g., "queue-worker", "horizon")
            $table->string('command'); // Command to run (e.g., "php artisan queue:work")
            $table->string('directory')->nullable(); // Working directory
            $table->string('user')->default('www-data'); // User to run as
            $table->integer('numprocs')->default(1); // Number of processes
            $table->boolean('autostart')->default(true);
            $table->boolean('autorestart')->default(true);
            $table->integer('startsecs')->default(1); // Seconds to wait before considering started
            $table->integer('stopwaitsecs')->default(10); // Seconds to wait for stop
            $table->string('stdout_logfile')->nullable(); // Standard output log file
            $table->string('stderr_logfile')->nullable(); // Standard error log file
            $table->enum('status', ['running', 'stopped', 'starting', 'stopping', 'fatal', 'unknown'])->default('stopped');
            $table->timestamp('last_started_at')->nullable();
            $table->timestamp('last_stopped_at')->nullable();
            $table->timestamps();

            $table->unique(['website_id', 'name']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supervisor_workers');
    }
};
