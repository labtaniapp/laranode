<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class EmailRelaySettings extends Model
{
    protected $fillable = [
        'user_id',
        'enabled',
        'provider',
        'smtp_host',
        'smtp_port',
        'smtp_username',
        'smtp_password',
        'smtp_encryption',
        'api_key',
        'api_endpoint',
        'use_for_all',
        'use_as_fallback',
        'critical_domains',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'smtp_port' => 'integer',
        'use_for_all' => 'boolean',
        'use_as_fallback' => 'boolean',
        'critical_domains' => 'array',
    ];

    protected $hidden = [
        'smtp_password',
        'api_key',
    ];

    /**
     * Default critical domains that should use relay.
     */
    public const DEFAULT_CRITICAL_DOMAINS = [
        'gmail.com',
        'googlemail.com',
        'outlook.com',
        'hotmail.com',
        'live.com',
        'msn.com',
        'yahoo.com',
        'yahoo.fr',
        'aol.com',
        'icloud.com',
        'me.com',
        'mac.com',
    ];

    /**
     * Available relay providers.
     */
    public const PROVIDERS = [
        'custom' => 'Custom SMTP',
        'mailgun' => 'Mailgun',
        'sendgrid' => 'SendGrid',
        'ses' => 'Amazon SES',
        'postmark' => 'Postmark',
        'mailjet' => 'Mailjet',
    ];

    /**
     * Provider default settings.
     */
    public const PROVIDER_DEFAULTS = [
        'mailgun' => [
            'smtp_host' => 'smtp.mailgun.org',
            'smtp_port' => 587,
            'smtp_encryption' => 'tls',
        ],
        'sendgrid' => [
            'smtp_host' => 'smtp.sendgrid.net',
            'smtp_port' => 587,
            'smtp_encryption' => 'tls',
        ],
        'ses' => [
            'smtp_host' => 'email-smtp.us-east-1.amazonaws.com',
            'smtp_port' => 587,
            'smtp_encryption' => 'tls',
        ],
        'postmark' => [
            'smtp_host' => 'smtp.postmarkapp.com',
            'smtp_port' => 587,
            'smtp_encryption' => 'tls',
        ],
        'mailjet' => [
            'smtp_host' => 'in-v3.mailjet.com',
            'smtp_port' => 587,
            'smtp_encryption' => 'tls',
        ],
    ];

    /**
     * Get the user.
     */
    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Encrypt the SMTP password.
     */
    public function setSmtpPasswordAttribute($value): void
    {
        if ($value) {
            $this->attributes['smtp_password'] = Crypt::encryptString($value);
        } else {
            $this->attributes['smtp_password'] = null;
        }
    }

    /**
     * Decrypt the SMTP password.
     */
    public function getSmtpPasswordDecryptedAttribute(): ?string
    {
        if ($this->smtp_password) {
            try {
                return Crypt::decryptString($this->smtp_password);
            } catch (\Exception $e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Encrypt the API key.
     */
    public function setApiKeyAttribute($value): void
    {
        if ($value) {
            $this->attributes['api_key'] = Crypt::encryptString($value);
        } else {
            $this->attributes['api_key'] = null;
        }
    }

    /**
     * Decrypt the API key.
     */
    public function getApiKeyDecryptedAttribute(): ?string
    {
        if ($this->api_key) {
            try {
                return Crypt::decryptString($this->api_key);
            } catch (\Exception $e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Check if a domain should use relay.
     */
    public function shouldUseRelayForDomain(string $domain): bool
    {
        if (!$this->enabled) {
            return false;
        }

        if ($this->use_for_all) {
            return true;
        }

        $criticalDomains = $this->critical_domains ?? self::DEFAULT_CRITICAL_DOMAINS;
        return in_array(strtolower($domain), array_map('strtolower', $criticalDomains));
    }

    /**
     * Get or create settings for a user.
     */
    public static function forUser(User $user): self
    {
        return self::firstOrCreate(
            ['user_id' => $user->id],
            [
                'enabled' => false,
                'provider' => 'custom',
                'use_as_fallback' => true,
                'critical_domains' => self::DEFAULT_CRITICAL_DOMAINS,
            ]
        );
    }
}
