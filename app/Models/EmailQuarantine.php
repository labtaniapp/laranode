<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class EmailQuarantine extends Model
{
    protected $table = 'email_quarantine';

    protected $fillable = [
        'email_domain_id',
        'email_account_id',
        'reason',
        'from_address',
        'to_address',
        'subject',
        'spam_score',
        'virus_name',
        'file_path',
        'size',
        'expires_at',
    ];

    protected $casts = [
        'spam_score' => 'decimal:2',
        'size' => 'integer',
        'expires_at' => 'datetime',
    ];

    public function emailDomain(): BelongsTo
    {
        return $this->belongsTo(EmailDomain::class);
    }

    public function emailAccount(): BelongsTo
    {
        return $this->belongsTo(EmailAccount::class);
    }

    public static function quarantine(array $data, int $retentionDays = 30): self
    {
        $data['expires_at'] = now()->addDays($retentionDays);

        return self::create($data);
    }

    public function release(): bool
    {
        // Re-inject the message into the mail queue
        if (!file_exists($this->file_path)) {
            return false;
        }

        $command = "sudo postcat -q {$this->file_path} | sudo sendmail -i {$this->to_address}";
        exec($command, $output, $exitCode);

        if ($exitCode === 0) {
            $this->delete();
            @unlink($this->file_path);
            return true;
        }

        return false;
    }

    public function getPreview(): ?string
    {
        if (!file_exists($this->file_path)) {
            return null;
        }

        $content = file_get_contents($this->file_path);

        // Parse email and extract body preview
        $parts = explode("\r\n\r\n", $content, 2);
        if (count($parts) < 2) {
            $parts = explode("\n\n", $content, 2);
        }

        $body = $parts[1] ?? '';

        // Strip HTML if present
        if (stripos($body, '<html') !== false || stripos($body, '<body') !== false) {
            $body = strip_tags($body);
        }

        // Return first 500 chars
        return mb_substr(trim($body), 0, 500);
    }

    public static function cleanExpired(): int
    {
        $expired = self::where('expires_at', '<', now())->get();
        $count = 0;

        foreach ($expired as $item) {
            if (file_exists($item->file_path)) {
                @unlink($item->file_path);
            }
            $item->delete();
            $count++;
        }

        return $count;
    }

    public function scopeSpam($query)
    {
        return $query->where('reason', 'spam');
    }

    public function scopeVirus($query)
    {
        return $query->where('reason', 'virus');
    }

    public function scopeForDomain($query, int $domainId)
    {
        return $query->where('email_domain_id', $domainId);
    }

    public function scopeForAccount($query, int $accountId)
    {
        return $query->where('email_account_id', $accountId);
    }

    public function getReasonBadgeAttribute(): string
    {
        return match ($this->reason) {
            'spam' => 'Spam',
            'virus' => 'Virus',
            'policy' => 'Policy',
            default => 'Unknown',
        };
    }

    public function getSizeFormattedAttribute(): string
    {
        $bytes = $this->size;
        if ($bytes < 1024) return $bytes . ' B';
        if ($bytes < 1048576) return round($bytes / 1024, 1) . ' KB';
        return round($bytes / 1048576, 1) . ' MB';
    }
}
