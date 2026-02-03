<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Email statistics table
        Schema::create('email_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('email_domain_id')->constrained()->onDelete('cascade');
            $table->date('date');
            $table->unsignedInteger('sent')->default(0);
            $table->unsignedInteger('received')->default(0);
            $table->unsignedInteger('bounced')->default(0);
            $table->unsignedInteger('rejected')->default(0);
            $table->unsignedInteger('spam_blocked')->default(0);
            $table->unsignedInteger('virus_blocked')->default(0);
            $table->unsignedBigInteger('bytes_sent')->default(0);
            $table->unsignedBigInteger('bytes_received')->default(0);
            $table->timestamps();

            $table->unique(['email_domain_id', 'date']);
        });

        // Email logs table for detailed tracking
        Schema::create('email_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('email_domain_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('email_account_id')->nullable()->constrained()->onDelete('set null');
            $table->enum('direction', ['inbound', 'outbound']);
            $table->string('message_id')->nullable();
            $table->string('from_address');
            $table->string('to_address');
            $table->string('subject')->nullable();
            $table->unsignedInteger('size')->default(0);
            $table->enum('status', ['queued', 'sent', 'delivered', 'bounced', 'rejected', 'deferred', 'spam', 'virus']);
            $table->string('relay_used')->nullable();
            $table->decimal('spam_score', 5, 2)->nullable();
            $table->boolean('virus_detected')->default(false);
            $table->string('virus_name')->nullable();
            $table->text('status_message')->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['email_domain_id', 'created_at']);
            $table->index(['status', 'created_at']);
        });

        // Spam/Antivirus settings per domain
        Schema::create('email_security_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('email_domain_id')->constrained()->onDelete('cascade');

            // SpamAssassin settings
            $table->boolean('spam_filter_enabled')->default(true);
            $table->decimal('spam_threshold', 4, 1)->default(5.0); // Score above this = spam
            $table->decimal('spam_kill_threshold', 4, 1)->default(10.0); // Score above this = reject
            $table->enum('spam_action', ['tag', 'quarantine', 'reject'])->default('quarantine');
            $table->boolean('spam_learning_enabled')->default(true);

            // ClamAV settings
            $table->boolean('virus_filter_enabled')->default(true);
            $table->enum('virus_action', ['quarantine', 'reject', 'delete'])->default('reject');
            $table->boolean('scan_attachments')->default(true);
            $table->unsignedInteger('max_attachment_size')->default(26214400); // 25MB

            // Whitelist/Blacklist
            $table->json('whitelist')->nullable(); // Always accept from these
            $table->json('blacklist')->nullable(); // Always reject from these

            $table->timestamps();
        });

        // Quarantine table
        Schema::create('email_quarantine', function (Blueprint $table) {
            $table->id();
            $table->foreignId('email_domain_id')->constrained()->onDelete('cascade');
            $table->foreignId('email_account_id')->nullable()->constrained()->onDelete('set null');
            $table->enum('reason', ['spam', 'virus', 'policy']);
            $table->string('from_address');
            $table->string('to_address');
            $table->string('subject')->nullable();
            $table->decimal('spam_score', 5, 2)->nullable();
            $table->string('virus_name')->nullable();
            $table->string('file_path'); // Path to quarantined message
            $table->unsignedInteger('size')->default(0);
            $table->timestamp('expires_at');
            $table->timestamps();

            $table->index(['email_domain_id', 'reason']);
            $table->index('expires_at');
        });

        // Roundcube settings
        Schema::create('webmail_settings', function (Blueprint $table) {
            $table->id();
            $table->boolean('enabled')->default(false);
            $table->string('subdomain')->default('webmail'); // webmail.domain.com
            $table->unsignedInteger('port')->default(443);
            $table->string('skin')->default('elastic');
            $table->unsignedInteger('session_lifetime')->default(30); // minutes
            $table->unsignedInteger('max_message_size')->default(26214400); // 25MB
            $table->boolean('spell_check_enabled')->default(true);
            $table->json('plugins')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webmail_settings');
        Schema::dropIfExists('email_quarantine');
        Schema::dropIfExists('email_security_settings');
        Schema::dropIfExists('email_logs');
        Schema::dropIfExists('email_stats');
    }
};
