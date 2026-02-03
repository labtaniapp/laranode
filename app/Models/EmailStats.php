<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailStats extends Model
{
    protected $fillable = [
        'email_domain_id',
        'date',
        'sent',
        'received',
        'bounced',
        'rejected',
        'spam_blocked',
        'virus_blocked',
        'bytes_sent',
        'bytes_received',
    ];

    protected $casts = [
        'date' => 'date',
        'sent' => 'integer',
        'received' => 'integer',
        'bounced' => 'integer',
        'rejected' => 'integer',
        'spam_blocked' => 'integer',
        'virus_blocked' => 'integer',
        'bytes_sent' => 'integer',
        'bytes_received' => 'integer',
    ];

    public function emailDomain(): BelongsTo
    {
        return $this->belongsTo(EmailDomain::class);
    }

    public static function incrementStat(int $domainId, string $stat, int $amount = 1): void
    {
        $today = now()->toDateString();

        $stats = self::firstOrCreate(
            ['email_domain_id' => $domainId, 'date' => $today],
            ['sent' => 0, 'received' => 0, 'bounced' => 0, 'rejected' => 0, 'spam_blocked' => 0, 'virus_blocked' => 0]
        );

        $stats->increment($stat, $amount);
    }

    public static function addBytes(int $domainId, string $direction, int $bytes): void
    {
        $today = now()->toDateString();

        $stats = self::firstOrCreate(
            ['email_domain_id' => $domainId, 'date' => $today],
            ['bytes_sent' => 0, 'bytes_received' => 0]
        );

        $field = $direction === 'outbound' ? 'bytes_sent' : 'bytes_received';
        $stats->increment($field, $bytes);
    }

    public static function getStatsForDomain(int $domainId, int $days = 30): array
    {
        $stats = self::where('email_domain_id', $domainId)
            ->where('date', '>=', now()->subDays($days))
            ->orderBy('date')
            ->get();

        return [
            'daily' => $stats,
            'totals' => [
                'sent' => $stats->sum('sent'),
                'received' => $stats->sum('received'),
                'bounced' => $stats->sum('bounced'),
                'rejected' => $stats->sum('rejected'),
                'spam_blocked' => $stats->sum('spam_blocked'),
                'virus_blocked' => $stats->sum('virus_blocked'),
                'bytes_sent' => $stats->sum('bytes_sent'),
                'bytes_received' => $stats->sum('bytes_received'),
            ],
        ];
    }
}
