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
        Schema::create('git_repositories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('provider', ['github', 'gitlab', 'bitbucket', 'custom'])->default('github');
            $table->string('repository_url');
            $table->string('branch')->default('main');
            $table->text('deploy_key')->nullable(); // SSH private key (encrypted)
            $table->string('webhook_secret')->nullable();
            $table->boolean('auto_deploy')->default(false);
            $table->text('deploy_script')->nullable(); // Custom deploy commands
            $table->enum('framework', ['laravel', 'nodejs', 'nuxt', 'nextjs', 'static', 'custom'])->default('custom');
            $table->boolean('zero_downtime')->default(true);
            $table->integer('keep_releases')->default(5);
            $table->json('environment_variables')->nullable();
            $table->timestamp('last_deployed_at')->nullable();
            $table->timestamps();

            $table->unique('website_id');
            $table->index(['user_id', 'auto_deploy']);
        });

        Schema::create('deployments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('git_repository_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('commit_hash', 40)->nullable();
            $table->string('commit_message')->nullable();
            $table->string('commit_author')->nullable();
            $table->string('branch');
            $table->enum('status', ['pending', 'cloning', 'building', 'deploying', 'completed', 'failed', 'rolled_back'])->default('pending');
            $table->enum('trigger', ['manual', 'webhook', 'rollback'])->default('manual');
            $table->text('log')->nullable();
            $table->text('error_message')->nullable();
            $table->string('release_path')->nullable();
            $table->integer('duration')->nullable(); // in seconds
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['git_repository_id', 'status']);
            $table->index(['git_repository_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('deployments');
        Schema::dropIfExists('git_repositories');
    }
};
