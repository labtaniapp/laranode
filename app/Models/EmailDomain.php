<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class EmailDomain extends Model
{
    protected $fillable = [
        'website_id',
        'user_id',
        'domain',
        'active',
        'catch_all',
        'catch_all_address',
        'dkim_private_key',
        'dkim_public_key',
        'dkim_selector',
    ];

    protected $casts = [
        'active' => 'boolean',
        'catch_all' => 'boolean',
    ];

    protected $hidden = [
        'dkim_private_key',
    ];

    /**
     * Get the website that owns this email domain.
     */
    public function website(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Website::class);
    }

    /**
     * Get the user that owns this email domain.
     */
    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the email accounts for this domain.
     */
    public function accounts(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(EmailAccount::class);
    }

    /**
     * Get the email aliases for this domain.
     */
    public function aliases(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(EmailAlias::class);
    }

    /**
     * Generate DKIM keys for this domain.
     */
    public function generateDkimKeys(): void
    {
        $config = [
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
        ];

        $res = openssl_pkey_new($config);
        openssl_pkey_export($res, $privateKey);
        $publicKey = openssl_pkey_get_details($res)['key'];

        // Clean up public key for DNS record
        $publicKeyDns = str_replace(['-----BEGIN PUBLIC KEY-----', '-----END PUBLIC KEY-----', "\n", "\r"], '', $publicKey);

        $this->update([
            'dkim_private_key' => $privateKey,
            'dkim_public_key' => $publicKeyDns,
            'dkim_selector' => 'mail',
        ]);
    }

    /**
     * Get DNS records needed for this email domain.
     */
    public function getDnsRecordsAttribute(): array
    {
        $records = [];

        // MX Record
        $records[] = [
            'type' => 'MX',
            'name' => '@',
            'value' => 'mail.' . $this->domain,
            'priority' => 10,
            'description' => 'Mail server',
        ];

        // A Record for mail subdomain (needs server IP)
        $records[] = [
            'type' => 'A',
            'name' => 'mail',
            'value' => '[SERVER_IP]',
            'description' => 'Mail server IP',
        ];

        // SPF Record
        $records[] = [
            'type' => 'TXT',
            'name' => '@',
            'value' => 'v=spf1 a mx ip4:[SERVER_IP] ~all',
            'description' => 'SPF - Authorized senders',
        ];

        // DKIM Record
        if ($this->dkim_public_key) {
            $records[] = [
                'type' => 'TXT',
                'name' => $this->dkim_selector . '._domainkey',
                'value' => 'v=DKIM1; k=rsa; p=' . $this->dkim_public_key,
                'description' => 'DKIM - Email signature',
            ];
        }

        // DMARC Record
        $records[] = [
            'type' => 'TXT',
            'name' => '_dmarc',
            'value' => 'v=DMARC1; p=quarantine; rua=mailto:postmaster@' . $this->domain,
            'description' => 'DMARC - Policy',
        ];

        return $records;
    }

    /**
     * Get mail directory path.
     */
    public function getMailDirAttribute(): string
    {
        return '/var/vmail/' . $this->domain;
    }
}
