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
        // Email domains - domains with email enabled
        Schema::create('email_domains', function (Blueprint $table) {
            $table->id();
            $table->foreignId('website_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('domain')->unique();
            $table->boolean('active')->default(true);
            $table->boolean('catch_all')->default(false);
            $table->string('catch_all_address')->nullable();
            // DKIM
            $table->text('dkim_private_key')->nullable();
            $table->text('dkim_public_key')->nullable();
            $table->string('dkim_selector')->default('mail');
            $table->timestamps();
        });

        // Email accounts - mailboxes
        Schema::create('email_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('email_domain_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('email')->unique(); // full email: user@domain.com
            $table->string('local_part'); // just "user" part
            $table->string('password'); // hashed for dovecot
            $table->string('name')->nullable(); // display name
            $table->bigInteger('quota')->default(1073741824); // 1GB default
            $table->bigInteger('used_quota')->default(0);
            $table->boolean('active')->default(true);
            $table->timestamp('last_login_at')->nullable();
            $table->timestamps();
        });

        // Email aliases - forwarding
        Schema::create('email_aliases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('email_domain_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('source_email'); // alias@domain.com
            $table->string('destination_email'); // forward to
            $table->boolean('active')->default(true);
            $table->timestamps();

            $table->unique(['source_email', 'destination_email']);
        });

        // Email relay settings
        Schema::create('email_relay_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->boolean('enabled')->default(false);
            $table->string('provider')->default('custom'); // mailgun, sendgrid, ses, smtp, custom
            // SMTP settings
            $table->string('smtp_host')->nullable();
            $table->integer('smtp_port')->default(587);
            $table->string('smtp_username')->nullable();
            $table->text('smtp_password')->nullable(); // encrypted
            $table->string('smtp_encryption')->default('tls'); // tls, ssl, none
            // Provider-specific
            $table->string('api_key')->nullable(); // for Mailgun, SendGrid, etc.
            $table->string('api_endpoint')->nullable();
            // Relay rules
            $table->boolean('use_for_all')->default(false); // use relay for all outgoing
            $table->boolean('use_as_fallback')->default(true); // use as fallback when direct fails
            $table->json('critical_domains')->nullable(); // domains to always use relay: ["gmail.com", "outlook.com"]
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('email_relay_settings');
        Schema::dropIfExists('email_aliases');
        Schema::dropIfExists('email_accounts');
        Schema::dropIfExists('email_domains');
    }
};
