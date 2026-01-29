<?php

namespace App\Models;

use App\Enums\RuntimeType;
use Illuminate\Database\Eloquent\Model;

class RuntimeAvailableVersion extends Model
{
    protected $fillable = [
        'type',
        'version',
        'label',
        'is_lts',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_lts' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    /**
     * Scope to get only active versions
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to filter by runtime type
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to order by sort_order
     */
    public function scopeOrdered($query)
    {
        return $query->orderBy('sort_order')->orderByDesc('version');
    }

    /**
     * Get PHP versions
     */
    public static function phpVersions()
    {
        return static::active()->ofType('php')->ordered()->get();
    }

    /**
     * Get Node.js versions
     */
    public static function nodeVersions()
    {
        return static::active()->ofType('nodejs')->ordered()->get();
    }

    /**
     * Get display label
     */
    public function getDisplayLabelAttribute(): string
    {
        if ($this->label) {
            return $this->label;
        }

        $prefix = $this->type === 'php' ? 'PHP' : 'Node.js';
        $suffix = $this->is_lts ? ' (LTS)' : '';

        return "{$prefix} {$this->version}{$suffix}";
    }
}
