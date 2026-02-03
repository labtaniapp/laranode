<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailSecuritySettings extends Model
{
    protected $fillable = [
        'email_domain_id',
        'spam_filter_enabled',
        'spam_threshold',
        'spam_kill_threshold',
        'spam_action',
        'spam_learning_enabled',
        'virus_filter_enabled',
        'virus_action',
        'scan_attachments',
        'max_attachment_size',
        'whitelist',
        'blacklist',
    ];

    protected $casts = [
        'spam_filter_enabled' => 'boolean',
        'spam_threshold' => 'decimal:1',
        'spam_kill_threshold' => 'decimal:1',
        'spam_learning_enabled' => 'boolean',
        'virus_filter_enabled' => 'boolean',
        'scan_attachments' => 'boolean',
        'max_attachment_size' => 'integer',
        'whitelist' => 'array',
        'blacklist' => 'array',
    ];

    public function emailDomain(): BelongsTo
    {
        return $this->belongsTo(EmailDomain::class);
    }

    public static function getOrCreateForDomain(int $domainId): self
    {
        return self::firstOrCreate(
            ['email_domain_id' => $domainId],
            [
                'spam_filter_enabled' => true,
                'spam_threshold' => 5.0,
                'spam_kill_threshold' => 10.0,
                'spam_action' => 'quarantine',
                'spam_learning_enabled' => true,
                'virus_filter_enabled' => true,
                'virus_action' => 'reject',
                'scan_attachments' => true,
                'max_attachment_size' => 26214400,
                'whitelist' => [],
                'blacklist' => [],
            ]
        );
    }

    public function isWhitelisted(string $email): bool
    {
        if (empty($this->whitelist)) {
            return false;
        }

        $domain = substr($email, strpos($email, '@') + 1);

        foreach ($this->whitelist as $entry) {
            if ($entry === $email || $entry === $domain || $entry === "*@{$domain}") {
                return true;
            }
        }

        return false;
    }

    public function isBlacklisted(string $email): bool
    {
        if (empty($this->blacklist)) {
            return false;
        }

        $domain = substr($email, strpos($email, '@') + 1);

        foreach ($this->blacklist as $entry) {
            if ($entry === $email || $entry === $domain || $entry === "*@{$domain}") {
                return true;
            }
        }

        return false;
    }

    public function addToWhitelist(string $entry): void
    {
        $whitelist = $this->whitelist ?? [];
        if (!in_array($entry, $whitelist)) {
            $whitelist[] = $entry;
            $this->update(['whitelist' => $whitelist]);
        }
    }

    public function removeFromWhitelist(string $entry): void
    {
        $whitelist = $this->whitelist ?? [];
        $whitelist = array_values(array_filter($whitelist, fn($e) => $e !== $entry));
        $this->update(['whitelist' => $whitelist]);
    }

    public function addToBlacklist(string $entry): void
    {
        $blacklist = $this->blacklist ?? [];
        if (!in_array($entry, $blacklist)) {
            $blacklist[] = $entry;
            $this->update(['blacklist' => $blacklist]);
        }
    }

    public function removeFromBlacklist(string $entry): void
    {
        $blacklist = $this->blacklist ?? [];
        $blacklist = array_values(array_filter($blacklist, fn($e) => $e !== $entry));
        $this->update(['blacklist' => $blacklist]);
    }

    public function generateSpamAssassinConfig(): string
    {
        $config = "# SpamAssassin configuration for {$this->emailDomain->domain}\n";
        $config .= "required_score {$this->spam_threshold}\n";

        if ($this->spam_learning_enabled) {
            $config .= "use_bayes 1\n";
            $config .= "bayes_auto_learn 1\n";
        }

        // Whitelist
        foreach ($this->whitelist ?? [] as $entry) {
            if (str_contains($entry, '@')) {
                $config .= "whitelist_from {$entry}\n";
            } else {
                $config .= "whitelist_from *@{$entry}\n";
            }
        }

        // Blacklist
        foreach ($this->blacklist ?? [] as $entry) {
            if (str_contains($entry, '@')) {
                $config .= "blacklist_from {$entry}\n";
            } else {
                $config .= "blacklist_from *@{$entry}\n";
            }
        }

        return $config;
    }
}
