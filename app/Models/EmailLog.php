<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailLog extends Model
{
    protected $fillable = [
        'email_domain_id',
        'email_account_id',
        'direction',
        'message_id',
        'from_address',
        'to_address',
        'subject',
        'size',
        'status',
        'relay_used',
        'spam_score',
        'virus_detected',
        'virus_name',
        'status_message',
        'processed_at',
    ];

    protected $casts = [
        'size' => 'integer',
        'spam_score' => 'decimal:2',
        'virus_detected' => 'boolean',
        'processed_at' => 'datetime',
    ];

    public function emailDomain(): BelongsTo
    {
        return $this->belongsTo(EmailDomain::class);
    }

    public function emailAccount(): BelongsTo
    {
        return $this->belongsTo(EmailAccount::class);
    }

    public static function log(array $data): self
    {
        $log = self::create($data);

        // Update stats
        if ($log->email_domain_id) {
            $stat = match ($log->status) {
                'sent', 'delivered' => $log->direction === 'outbound' ? 'sent' : 'received',
                'bounced' => 'bounced',
                'rejected' => 'rejected',
                'spam' => 'spam_blocked',
                'virus' => 'virus_blocked',
                default => null,
            };

            if ($stat) {
                EmailStats::incrementStat($log->email_domain_id, $stat);
            }

            if ($log->size > 0) {
                EmailStats::addBytes($log->email_domain_id, $log->direction, $log->size);
            }
        }

        return $log;
    }

    public function scopeForDomain($query, int $domainId)
    {
        return $query->where('email_domain_id', $domainId);
    }

    public function scopeInbound($query)
    {
        return $query->where('direction', 'inbound');
    }

    public function scopeOutbound($query)
    {
        return $query->where('direction', 'outbound');
    }

    public function scopeRecent($query, int $hours = 24)
    {
        return $query->where('created_at', '>=', now()->subHours($hours));
    }
}
