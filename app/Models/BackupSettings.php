<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Crypt;

class BackupSettings extends Model
{
    protected $fillable = [
        'user_id',
        'auto_backup_enabled',
        'frequency',
        'retention_days',
        'storage',
        's3_bucket',
        's3_region',
        's3_access_key',
        's3_secret_key',
        's3_path',
    ];

    protected $casts = [
        'auto_backup_enabled' => 'boolean',
        'retention_days' => 'integer',
    ];

    protected $hidden = [
        's3_secret_key',
    ];

    /**
     * Get the user that owns the settings.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Encrypt S3 secret key when setting.
     */
    public function setS3SecretKeyAttribute($value): void
    {
        if ($value) {
            $this->attributes['s3_secret_key'] = Crypt::encryptString($value);
        } else {
            $this->attributes['s3_secret_key'] = null;
        }
    }

    /**
     * Decrypt S3 secret key when getting.
     */
    public function getS3SecretKeyDecryptedAttribute(): ?string
    {
        if ($this->s3_secret_key) {
            try {
                return Crypt::decryptString($this->s3_secret_key);
            } catch (\Exception $e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Check if S3 is configured.
     */
    public function isS3Configured(): bool
    {
        return $this->storage === 's3'
            && $this->s3_bucket
            && $this->s3_region
            && $this->s3_access_key
            && $this->s3_secret_key;
    }

    /**
     * Get or create settings for user.
     */
    public static function forUser(User $user): self
    {
        return self::firstOrCreate(
            ['user_id' => $user->id],
            [
                'auto_backup_enabled' => false,
                'frequency' => 'daily',
                'retention_days' => 7,
                'storage' => 'local',
            ]
        );
    }
}
