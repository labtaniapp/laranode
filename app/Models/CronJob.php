<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CronJob extends Model
{
    protected $fillable = [
        'website_id',
        'user_id',
        'name',
        'minute',
        'hour',
        'day',
        'month',
        'weekday',
        'command',
        'is_active',
        'last_run_at',
        'last_output',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'last_run_at' => 'datetime',
    ];

    /**
     * Cron schedule templates
     */
    public static function templates(): array
    {
        return [
            ['value' => 'every_minute', 'label' => 'Every Minute', 'minute' => '*', 'hour' => '*', 'day' => '*', 'month' => '*', 'weekday' => '*'],
            ['value' => 'every_5_minutes', 'label' => 'Every 5 Minutes', 'minute' => '*/5', 'hour' => '*', 'day' => '*', 'month' => '*', 'weekday' => '*'],
            ['value' => 'every_10_minutes', 'label' => 'Every 10 Minutes', 'minute' => '*/10', 'hour' => '*', 'day' => '*', 'month' => '*', 'weekday' => '*'],
            ['value' => 'every_15_minutes', 'label' => 'Every 15 Minutes', 'minute' => '*/15', 'hour' => '*', 'day' => '*', 'month' => '*', 'weekday' => '*'],
            ['value' => 'every_30_minutes', 'label' => 'Every 30 Minutes', 'minute' => '*/30', 'hour' => '*', 'day' => '*', 'month' => '*', 'weekday' => '*'],
            ['value' => 'hourly', 'label' => 'Hourly', 'minute' => '0', 'hour' => '*', 'day' => '*', 'month' => '*', 'weekday' => '*'],
            ['value' => 'daily', 'label' => 'Daily (at midnight)', 'minute' => '0', 'hour' => '0', 'day' => '*', 'month' => '*', 'weekday' => '*'],
            ['value' => 'daily_6am', 'label' => 'Daily (at 6:00 AM)', 'minute' => '0', 'hour' => '6', 'day' => '*', 'month' => '*', 'weekday' => '*'],
            ['value' => 'weekly', 'label' => 'Weekly (Sunday midnight)', 'minute' => '0', 'hour' => '0', 'day' => '*', 'month' => '*', 'weekday' => '0'],
            ['value' => 'monthly', 'label' => 'Monthly (1st at midnight)', 'minute' => '0', 'hour' => '0', 'day' => '1', 'month' => '*', 'weekday' => '*'],
            ['value' => 'custom', 'label' => 'Custom', 'minute' => '*', 'hour' => '*', 'day' => '*', 'month' => '*', 'weekday' => '*'],
        ];
    }

    /**
     * Get the cron expression
     */
    public function getCronExpressionAttribute(): string
    {
        return "{$this->minute} {$this->hour} {$this->day} {$this->month} {$this->weekday}";
    }

    /**
     * Get human-readable schedule
     */
    public function getScheduleLabelAttribute(): string
    {
        $expression = $this->cron_expression;

        foreach (self::templates() as $template) {
            $templateExpr = "{$template['minute']} {$template['hour']} {$template['day']} {$template['month']} {$template['weekday']}";
            if ($expression === $templateExpr && $template['value'] !== 'custom') {
                return $template['label'];
            }
        }

        return $expression; // Return raw expression if no match
    }

    /**
     * Website relationship
     */
    public function website(): BelongsTo
    {
        return $this->belongsTo(Website::class);
    }

    /**
     * User relationship
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope for active cron jobs
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope for a specific website
     */
    public function scopeForWebsite($query, $websiteId)
    {
        return $query->where('website_id', $websiteId);
    }

    /**
     * Generate the crontab line for this job
     */
    public function toCrontabLine(): string
    {
        return "{$this->cron_expression} {$this->command}";
    }
}
