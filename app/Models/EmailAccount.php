<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailAccount extends Model
{
    protected $fillable = [
        'email_domain_id',
        'user_id',
        'email',
        'local_part',
        'password',
        'name',
        'quota',
        'used_quota',
        'active',
        'last_login_at',
    ];

    protected $casts = [
        'quota' => 'integer',
        'used_quota' => 'integer',
        'active' => 'boolean',
        'last_login_at' => 'datetime',
    ];

    protected $hidden = [
        'password',
    ];

    /**
     * Get the email domain.
     */
    public function emailDomain(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(EmailDomain::class);
    }

    /**
     * Get the user that owns this account.
     */
    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Generate dovecot-compatible password hash.
     */
    public static function hashPassword(string $password): string
    {
        // SHA512-CRYPT for Dovecot
        return '{SHA512-CRYPT}' . crypt($password, '$6$' . bin2hex(random_bytes(8)));
    }

    /**
     * Set the password with proper hashing.
     */
    public function setPasswordAttribute($value): void
    {
        // Only hash if it's not already hashed
        if (!str_starts_with($value, '{SHA512-CRYPT}')) {
            $value = self::hashPassword($value);
        }
        $this->attributes['password'] = $value;
    }

    /**
     * Get formatted quota.
     */
    public function getFormattedQuotaAttribute(): string
    {
        return $this->formatBytes($this->quota);
    }

    /**
     * Get formatted used quota.
     */
    public function getFormattedUsedQuotaAttribute(): string
    {
        return $this->formatBytes($this->used_quota);
    }

    /**
     * Get quota usage percentage.
     */
    public function getQuotaPercentageAttribute(): int
    {
        if ($this->quota <= 0) {
            return 0;
        }
        return min(100, (int) round(($this->used_quota / $this->quota) * 100));
    }

    /**
     * Get maildir path for this account.
     */
    public function getMailDirAttribute(): string
    {
        return '/var/vmail/' . $this->emailDomain->domain . '/' . $this->local_part;
    }

    /**
     * Format bytes to human readable.
     */
    protected function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }
        return round($bytes, 2) . ' ' . $units[$i];
    }
}
