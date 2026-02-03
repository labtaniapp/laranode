<?php

namespace App\Http\Controllers;

use App\Models\EmailAccount;
use App\Models\EmailAlias;
use App\Models\EmailDomain;
use App\Models\EmailLog;
use App\Models\EmailQuarantine;
use App\Models\EmailRelaySettings;
use App\Models\EmailSecuritySettings;
use App\Models\EmailStats;
use App\Models\WebmailSettings;
use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Http;

class EmailController extends Controller
{
    /**
     * Get email data for a website.
     */
    public function index(Website $website)
    {
        Gate::authorize('view', $website);

        $emailDomain = $website->emailDomain;

        $data = [
            'domain_enabled' => (bool) $emailDomain,
            'domain' => null,
            'accounts' => [],
            'aliases' => [],
            'dns_records' => [],
        ];

        if ($emailDomain) {
            $data['domain'] = [
                'id' => $emailDomain->id,
                'domain' => $emailDomain->domain,
                'active' => $emailDomain->active,
                'catch_all' => $emailDomain->catch_all,
                'catch_all_address' => $emailDomain->catch_all_address,
                'has_dkim' => !empty($emailDomain->dkim_public_key),
            ];

            $data['accounts'] = $emailDomain->accounts()->orderBy('local_part')->get()->map(fn($a) => [
                'id' => $a->id,
                'email' => $a->email,
                'name' => $a->name,
                'quota' => $a->quota,
                'quota_formatted' => $a->formatted_quota,
                'used_quota' => $a->used_quota,
                'used_quota_formatted' => $a->formatted_used_quota,
                'quota_percentage' => $a->quota_percentage,
                'active' => $a->active,
                'last_login_at' => $a->last_login_at,
            ]);

            $data['aliases'] = $emailDomain->aliases()->orderBy('source_email')->get()->map(fn($a) => [
                'id' => $a->id,
                'source_email' => $a->source_email,
                'destination_email' => $a->destination_email,
                'active' => $a->active,
            ]);

            // Get DNS records with server IP
            $serverIp = $this->getServerIp();
            $data['dns_records'] = collect($emailDomain->dns_records)->map(function ($record) use ($serverIp) {
                $record['value'] = str_replace('[SERVER_IP]', $serverIp, $record['value']);
                return $record;
            });
        }

        return response()->json($data);
    }

    /**
     * Enable email for a domain/website.
     */
    public function enableDomain(Request $request, Website $website)
    {
        Gate::authorize('update', $website);

        // Check if already enabled
        if ($website->emailDomain) {
            return back()->withErrors(['error' => 'Email is already enabled for this domain.']);
        }

        $user = $request->user();

        // Create email domain
        $emailDomain = EmailDomain::create([
            'website_id' => $website->id,
            'user_id' => $user->id,
            'domain' => $website->url,
            'active' => true,
        ]);

        // Generate DKIM keys
        $emailDomain->generateDkimKeys();

        // Run shell script to set up domain
        $scriptPath = base_path('laranode-scripts/bin/laranode-mail-domain-add.sh');
        Process::run("sudo bash {$scriptPath} " . escapeshellarg($website->url));

        session()->flash('success', 'Email enabled for ' . $website->url);

        return back();
    }

    /**
     * Disable email for a domain/website.
     */
    public function disableDomain(Website $website)
    {
        Gate::authorize('update', $website);

        $emailDomain = $website->emailDomain;

        if (!$emailDomain) {
            return back()->withErrors(['error' => 'Email is not enabled for this domain.']);
        }

        // Run shell script to remove domain
        $scriptPath = base_path('laranode-scripts/bin/laranode-mail-domain-remove.sh');
        Process::run("sudo bash {$scriptPath} " . escapeshellarg($website->url));

        // Delete will cascade to accounts and aliases
        $emailDomain->delete();

        session()->flash('success', 'Email disabled for ' . $website->url);

        return back();
    }

    /**
     * Create an email account.
     */
    public function createAccount(Request $request, Website $website)
    {
        Gate::authorize('update', $website);

        $emailDomain = $website->emailDomain;

        if (!$emailDomain) {
            return back()->withErrors(['error' => 'Email is not enabled for this domain.']);
        }

        $validated = $request->validate([
            'local_part' => 'required|string|max:64|regex:/^[a-z0-9._-]+$/i',
            'password' => 'required|string|min:8',
            'name' => 'nullable|string|max:255',
            'quota' => 'nullable|integer|min:104857600', // Min 100MB
        ]);

        $email = strtolower($validated['local_part']) . '@' . $emailDomain->domain;

        // Check if account already exists
        if (EmailAccount::where('email', $email)->exists()) {
            return back()->withErrors(['local_part' => 'This email address already exists.']);
        }

        $user = $request->user();

        // Create account
        $account = EmailAccount::create([
            'email_domain_id' => $emailDomain->id,
            'user_id' => $user->id,
            'email' => $email,
            'local_part' => strtolower($validated['local_part']),
            'password' => $validated['password'], // Will be hashed by model
            'name' => $validated['name'] ?? null,
            'quota' => $validated['quota'] ?? 1073741824, // 1GB default
            'active' => true,
        ]);

        // Run shell script to create maildir
        $scriptPath = base_path('laranode-scripts/bin/laranode-mail-account-add.sh');
        Process::run("sudo bash {$scriptPath} " . escapeshellarg($email) . " " . escapeshellarg($emailDomain->domain));

        session()->flash('success', 'Email account ' . $email . ' created.');

        return back();
    }

    /**
     * Update an email account.
     */
    public function updateAccount(Request $request, EmailAccount $account)
    {
        Gate::authorize('update', $account->emailDomain->website);

        $validated = $request->validate([
            'password' => 'nullable|string|min:8',
            'name' => 'nullable|string|max:255',
            'quota' => 'nullable|integer|min:104857600',
            'active' => 'boolean',
        ]);

        $updateData = [
            'name' => $validated['name'] ?? $account->name,
            'active' => $validated['active'] ?? $account->active,
        ];

        if (!empty($validated['password'])) {
            $updateData['password'] = $validated['password'];
        }

        if (isset($validated['quota'])) {
            $updateData['quota'] = $validated['quota'];
        }

        $account->update($updateData);

        session()->flash('success', 'Email account updated.');

        return back();
    }

    /**
     * Delete an email account.
     */
    public function deleteAccount(EmailAccount $account)
    {
        Gate::authorize('delete', $account->emailDomain->website);

        $email = $account->email;
        $domain = $account->emailDomain->domain;

        // Run shell script to remove maildir
        $scriptPath = base_path('laranode-scripts/bin/laranode-mail-account-remove.sh');
        Process::run("sudo bash {$scriptPath} " . escapeshellarg($email) . " " . escapeshellarg($domain));

        $account->delete();

        session()->flash('success', 'Email account ' . $email . ' deleted.');

        return back();
    }

    /**
     * Create an email alias.
     */
    public function createAlias(Request $request, Website $website)
    {
        Gate::authorize('update', $website);

        $emailDomain = $website->emailDomain;

        if (!$emailDomain) {
            return back()->withErrors(['error' => 'Email is not enabled for this domain.']);
        }

        $validated = $request->validate([
            'source_local' => 'required|string|max:64|regex:/^[a-z0-9._-]+$/i',
            'destination_email' => 'required|email|max:255',
        ]);

        $sourceEmail = strtolower($validated['source_local']) . '@' . $emailDomain->domain;

        // Check if alias already exists
        if (EmailAlias::where('source_email', $sourceEmail)->where('destination_email', $validated['destination_email'])->exists()) {
            return back()->withErrors(['source_local' => 'This alias already exists.']);
        }

        $user = $request->user();

        EmailAlias::create([
            'email_domain_id' => $emailDomain->id,
            'user_id' => $user->id,
            'source_email' => $sourceEmail,
            'destination_email' => $validated['destination_email'],
            'active' => true,
        ]);

        session()->flash('success', 'Alias ' . $sourceEmail . ' created.');

        return back();
    }

    /**
     * Delete an email alias.
     */
    public function deleteAlias(EmailAlias $alias)
    {
        Gate::authorize('delete', $alias->emailDomain->website);

        $alias->delete();

        session()->flash('success', 'Alias deleted.');

        return back();
    }

    /**
     * Get relay settings.
     */
    public function getRelaySettings(Request $request)
    {
        $settings = EmailRelaySettings::forUser($request->user());

        return response()->json([
            'enabled' => $settings->enabled,
            'provider' => $settings->provider,
            'smtp_host' => $settings->smtp_host,
            'smtp_port' => $settings->smtp_port,
            'smtp_username' => $settings->smtp_username,
            'smtp_encryption' => $settings->smtp_encryption,
            'use_for_all' => $settings->use_for_all,
            'use_as_fallback' => $settings->use_as_fallback,
            'critical_domains' => $settings->critical_domains ?? EmailRelaySettings::DEFAULT_CRITICAL_DOMAINS,
            'providers' => EmailRelaySettings::PROVIDERS,
            'provider_defaults' => EmailRelaySettings::PROVIDER_DEFAULTS,
        ]);
    }

    /**
     * Update relay settings.
     */
    public function updateRelaySettings(Request $request)
    {
        $validated = $request->validate([
            'enabled' => 'boolean',
            'provider' => 'required|string|in:custom,mailgun,sendgrid,ses,postmark,mailjet',
            'smtp_host' => 'required_if:provider,custom|nullable|string|max:255',
            'smtp_port' => 'nullable|integer|min:1|max:65535',
            'smtp_username' => 'nullable|string|max:255',
            'smtp_password' => 'nullable|string|max:255',
            'smtp_encryption' => 'nullable|string|in:tls,ssl,none',
            'api_key' => 'nullable|string|max:255',
            'use_for_all' => 'boolean',
            'use_as_fallback' => 'boolean',
            'critical_domains' => 'nullable|array',
            'critical_domains.*' => 'string|max:255',
        ]);

        $settings = EmailRelaySettings::forUser($request->user());

        $updateData = [
            'enabled' => $validated['enabled'] ?? false,
            'provider' => $validated['provider'],
            'smtp_host' => $validated['smtp_host'] ?? null,
            'smtp_port' => $validated['smtp_port'] ?? 587,
            'smtp_username' => $validated['smtp_username'] ?? null,
            'smtp_encryption' => $validated['smtp_encryption'] ?? 'tls',
            'use_for_all' => $validated['use_for_all'] ?? false,
            'use_as_fallback' => $validated['use_as_fallback'] ?? true,
            'critical_domains' => $validated['critical_domains'] ?? EmailRelaySettings::DEFAULT_CRITICAL_DOMAINS,
        ];

        // Only update password if provided
        if (!empty($validated['smtp_password'])) {
            $updateData['smtp_password'] = $validated['smtp_password'];
        }

        if (!empty($validated['api_key'])) {
            $updateData['api_key'] = $validated['api_key'];
        }

        $settings->update($updateData);

        session()->flash('success', 'Relay settings updated.');

        return back();
    }

    /**
     * Test relay connection.
     */
    public function testRelay(Request $request)
    {
        $validated = $request->validate([
            'smtp_host' => 'required|string',
            'smtp_port' => 'required|integer',
            'smtp_username' => 'nullable|string',
            'smtp_password' => 'nullable|string',
            'smtp_encryption' => 'nullable|string',
        ]);

        try {
            // Try to connect to SMTP server
            $fp = @fsockopen(
                ($validated['smtp_encryption'] === 'ssl' ? 'ssl://' : '') . $validated['smtp_host'],
                $validated['smtp_port'],
                $errno,
                $errstr,
                10
            );

            if (!$fp) {
                return response()->json([
                    'success' => false,
                    'message' => "Connection failed: {$errstr} ({$errno})",
                ]);
            }

            $response = fgets($fp, 256);
            fclose($fp);

            if (str_starts_with($response, '220')) {
                return response()->json([
                    'success' => true,
                    'message' => 'Connection successful',
                ]);
            }

            return response()->json([
                'success' => false,
                'message' => 'Unexpected response: ' . $response,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ]);
        }
    }

    /**
     * Regenerate DKIM keys for a domain.
     */
    public function regenerateDkim(Website $website)
    {
        Gate::authorize('update', $website);

        $emailDomain = $website->emailDomain;

        if (!$emailDomain) {
            return back()->withErrors(['error' => 'Email is not enabled for this domain.']);
        }

        $emailDomain->generateDkimKeys();

        // Re-run domain setup to regenerate DKIM files
        $scriptPath = base_path('laranode-scripts/bin/laranode-mail-domain-add.sh');
        Process::run("sudo bash {$scriptPath} " . escapeshellarg($website->url));

        session()->flash('success', 'DKIM keys regenerated. Update your DNS records.');

        return back();
    }

    /**
     * Get server IP for DNS records.
     */
    protected function getServerIp(): string
    {
        try {
            return Http::timeout(5)->get('https://api.ipify.org')->body();
        } catch (\Exception $e) {
            return '[SERVER_IP]';
        }
    }

    // ===========================================
    // EMAIL STATISTICS
    // ===========================================

    /**
     * Get email statistics for a domain.
     */
    public function getStats(Website $website, Request $request)
    {
        Gate::authorize('view', $website);

        $emailDomain = $website->emailDomain;

        if (!$emailDomain) {
            return response()->json(['error' => 'Email not enabled'], 400);
        }

        $days = $request->get('days', 30);
        $stats = EmailStats::getStatsForDomain($emailDomain->id, $days);

        return response()->json($stats);
    }

    /**
     * Get email logs for a domain.
     */
    public function getLogs(Website $website, Request $request)
    {
        Gate::authorize('view', $website);

        $emailDomain = $website->emailDomain;

        if (!$emailDomain) {
            return response()->json(['error' => 'Email not enabled'], 400);
        }

        $query = EmailLog::forDomain($emailDomain->id)
            ->orderBy('created_at', 'desc');

        if ($request->has('direction')) {
            $query->where('direction', $request->direction);
        }

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('from_address', 'like', "%{$search}%")
                  ->orWhere('to_address', 'like', "%{$search}%")
                  ->orWhere('subject', 'like', "%{$search}%");
            });
        }

        $logs = $query->paginate($request->get('per_page', 50));

        return response()->json($logs);
    }

    // ===========================================
    // SECURITY SETTINGS (SPAM/ANTIVIRUS)
    // ===========================================

    /**
     * Get security settings for a domain.
     */
    public function getSecuritySettings(Website $website)
    {
        Gate::authorize('view', $website);

        $emailDomain = $website->emailDomain;

        if (!$emailDomain) {
            return response()->json(['error' => 'Email not enabled'], 400);
        }

        $settings = EmailSecuritySettings::getOrCreateForDomain($emailDomain->id);

        return response()->json([
            'spam_filter_enabled' => $settings->spam_filter_enabled,
            'spam_threshold' => $settings->spam_threshold,
            'spam_kill_threshold' => $settings->spam_kill_threshold,
            'spam_action' => $settings->spam_action,
            'spam_learning_enabled' => $settings->spam_learning_enabled,
            'virus_filter_enabled' => $settings->virus_filter_enabled,
            'virus_action' => $settings->virus_action,
            'scan_attachments' => $settings->scan_attachments,
            'max_attachment_size' => $settings->max_attachment_size,
            'whitelist' => $settings->whitelist ?? [],
            'blacklist' => $settings->blacklist ?? [],
        ]);
    }

    /**
     * Update security settings for a domain.
     */
    public function updateSecuritySettings(Request $request, Website $website)
    {
        Gate::authorize('update', $website);

        $emailDomain = $website->emailDomain;

        if (!$emailDomain) {
            return back()->withErrors(['error' => 'Email not enabled']);
        }

        $validated = $request->validate([
            'spam_filter_enabled' => 'boolean',
            'spam_threshold' => 'numeric|min:1|max:20',
            'spam_kill_threshold' => 'numeric|min:1|max:50',
            'spam_action' => 'in:tag,quarantine,reject',
            'spam_learning_enabled' => 'boolean',
            'virus_filter_enabled' => 'boolean',
            'virus_action' => 'in:quarantine,reject,delete',
            'scan_attachments' => 'boolean',
            'max_attachment_size' => 'integer|min:1048576|max:104857600', // 1MB - 100MB
        ]);

        $settings = EmailSecuritySettings::getOrCreateForDomain($emailDomain->id);
        $settings->update($validated);

        // Regenerate SpamAssassin config
        $configPath = "/etc/spamassassin/domain_{$emailDomain->domain}.cf";
        file_put_contents($configPath, $settings->generateSpamAssassinConfig());

        // Reload SpamAssassin
        Process::run('sudo systemctl reload spamassassin');

        session()->flash('success', 'Security settings updated.');

        return back();
    }

    /**
     * Add to whitelist.
     */
    public function addToWhitelist(Request $request, Website $website)
    {
        Gate::authorize('update', $website);

        $emailDomain = $website->emailDomain;

        if (!$emailDomain) {
            return back()->withErrors(['error' => 'Email not enabled']);
        }

        $validated = $request->validate([
            'entry' => 'required|string|max:255',
        ]);

        $settings = EmailSecuritySettings::getOrCreateForDomain($emailDomain->id);
        $settings->addToWhitelist($validated['entry']);

        return back();
    }

    /**
     * Remove from whitelist.
     */
    public function removeFromWhitelist(Request $request, Website $website)
    {
        Gate::authorize('update', $website);

        $emailDomain = $website->emailDomain;

        if (!$emailDomain) {
            return back()->withErrors(['error' => 'Email not enabled']);
        }

        $settings = EmailSecuritySettings::getOrCreateForDomain($emailDomain->id);
        $settings->removeFromWhitelist($request->entry);

        return back();
    }

    /**
     * Add to blacklist.
     */
    public function addToBlacklist(Request $request, Website $website)
    {
        Gate::authorize('update', $website);

        $emailDomain = $website->emailDomain;

        if (!$emailDomain) {
            return back()->withErrors(['error' => 'Email not enabled']);
        }

        $validated = $request->validate([
            'entry' => 'required|string|max:255',
        ]);

        $settings = EmailSecuritySettings::getOrCreateForDomain($emailDomain->id);
        $settings->addToBlacklist($validated['entry']);

        return back();
    }

    /**
     * Remove from blacklist.
     */
    public function removeFromBlacklist(Request $request, Website $website)
    {
        Gate::authorize('update', $website);

        $emailDomain = $website->emailDomain;

        if (!$emailDomain) {
            return back()->withErrors(['error' => 'Email not enabled']);
        }

        $settings = EmailSecuritySettings::getOrCreateForDomain($emailDomain->id);
        $settings->removeFromBlacklist($request->entry);

        return back();
    }

    // ===========================================
    // QUARANTINE
    // ===========================================

    /**
     * Get quarantine items for a domain.
     */
    public function getQuarantine(Website $website, Request $request)
    {
        Gate::authorize('view', $website);

        $emailDomain = $website->emailDomain;

        if (!$emailDomain) {
            return response()->json(['error' => 'Email not enabled'], 400);
        }

        $query = EmailQuarantine::forDomain($emailDomain->id)
            ->orderBy('created_at', 'desc');

        if ($request->has('reason')) {
            $query->where('reason', $request->reason);
        }

        $items = $query->paginate($request->get('per_page', 25));

        return response()->json($items);
    }

    /**
     * Release a quarantined email.
     */
    public function releaseQuarantine(EmailQuarantine $quarantine)
    {
        Gate::authorize('update', $quarantine->emailDomain->website);

        if ($quarantine->release()) {
            return response()->json(['success' => true, 'message' => 'Message released']);
        }

        return response()->json(['success' => false, 'message' => 'Failed to release message'], 500);
    }

    /**
     * Delete a quarantined email.
     */
    public function deleteQuarantine(EmailQuarantine $quarantine)
    {
        Gate::authorize('delete', $quarantine->emailDomain->website);

        if (file_exists($quarantine->file_path)) {
            @unlink($quarantine->file_path);
        }

        $quarantine->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Preview a quarantined email.
     */
    public function previewQuarantine(EmailQuarantine $quarantine)
    {
        Gate::authorize('view', $quarantine->emailDomain->website);

        return response()->json([
            'from' => $quarantine->from_address,
            'to' => $quarantine->to_address,
            'subject' => $quarantine->subject,
            'reason' => $quarantine->reason,
            'spam_score' => $quarantine->spam_score,
            'virus_name' => $quarantine->virus_name,
            'preview' => $quarantine->getPreview(),
            'received_at' => $quarantine->created_at,
            'expires_at' => $quarantine->expires_at,
        ]);
    }

    // ===========================================
    // WEBMAIL (ROUNDCUBE)
    // ===========================================

    /**
     * Get webmail settings.
     */
    public function getWebmailSettings()
    {
        $settings = WebmailSettings::getSettings();

        return response()->json([
            'enabled' => $settings->enabled,
            'subdomain' => $settings->subdomain,
            'port' => $settings->port,
            'skin' => $settings->skin,
            'session_lifetime' => $settings->session_lifetime,
            'max_message_size' => $settings->max_message_size,
            'spell_check_enabled' => $settings->spell_check_enabled,
            'plugins' => $settings->plugins ?? [],
            'available_skins' => $settings->getAvailableSkins(),
            'available_plugins' => $settings->getAvailablePlugins(),
        ]);
    }

    /**
     * Update webmail settings.
     */
    public function updateWebmailSettings(Request $request)
    {
        $validated = $request->validate([
            'enabled' => 'boolean',
            'subdomain' => 'string|max:50|regex:/^[a-z0-9-]+$/',
            'skin' => 'string|in:elastic,larry',
            'session_lifetime' => 'integer|min:5|max:120',
            'max_message_size' => 'integer|min:1048576|max:104857600',
            'spell_check_enabled' => 'boolean',
            'plugins' => 'array',
            'plugins.*' => 'string',
        ]);

        $settings = WebmailSettings::getSettings();
        $settings->update($validated);

        // Generate new Roundcube config
        $configContent = $settings->generateConfig();
        file_put_contents('/etc/roundcube/config.inc.php', $configContent);

        // Restart Apache to apply changes
        Process::run('sudo systemctl reload apache2');

        session()->flash('success', 'Webmail settings updated.');

        return back();
    }

    /**
     * Get webmail URL for a domain.
     */
    public function getWebmailUrl(Website $website)
    {
        $settings = WebmailSettings::getSettings();

        if (!$settings->enabled) {
            return response()->json(['error' => 'Webmail is not enabled'], 400);
        }

        return response()->json([
            'url' => $settings->getWebmailUrl($website->url),
        ]);
    }

    /**
     * Train spam filter (mark as spam or ham).
     */
    public function trainSpam(Request $request, Website $website)
    {
        Gate::authorize('update', $website);

        $validated = $request->validate([
            'message_path' => 'required|string',
            'is_spam' => 'required|boolean',
        ]);

        $command = $validated['is_spam']
            ? "sa-learn --spam " . escapeshellarg($validated['message_path'])
            : "sa-learn --ham " . escapeshellarg($validated['message_path']);

        Process::run("sudo {$command}");

        return response()->json(['success' => true]);
    }
}
