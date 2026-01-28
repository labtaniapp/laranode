<?php

use App\Enums\ApplicationType;
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
        Schema::table('websites', function (Blueprint $table) {
            // Application type (php, nodejs, static, etc.)
            $table->string('application_type')->default(ApplicationType::PHP->value)->after('document_root');

            // Make php_version_id nullable (not needed for static/nodejs sites)
            $table->foreignId('php_version_id')->nullable()->change();

            // Node.js specific fields
            $table->foreignId('node_version_id')->nullable()->after('php_version_id');
            $table->string('startup_file')->nullable()->after('node_version_id'); // e.g., "app.js", "server.js"
            $table->unsignedInteger('app_port')->nullable()->after('startup_file'); // Internal port for Node.js app

            // Process management
            $table->unsignedTinyInteger('instances')->default(1)->after('app_port'); // Number of instances (PM2)
            $table->json('environment_variables')->nullable()->after('instances'); // Custom env vars

            // Add indexes
            $table->index('application_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('websites', function (Blueprint $table) {
            $table->dropIndex(['application_type']);
            $table->dropColumn([
                'application_type',
                'node_version_id',
                'startup_file',
                'app_port',
                'instances',
                'environment_variables',
            ]);
        });
    }
};
