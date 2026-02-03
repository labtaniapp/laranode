<?php

namespace App\Http\Controllers;

use App\Models\EmailAccount;
use App\Models\EmailAlias;
use App\Models\EmailDomain;
use App\Models\EmailRelaySettings;
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
}
