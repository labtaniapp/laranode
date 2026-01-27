<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class NodeVersion extends Model
{
    protected $fillable = [
        'version',
        'full_version',
        'binary_path',
        'active',
        'is_default',
    ];

    protected $casts = [
        'active' => 'boolean',
        'is_default' => 'boolean',
    ];

    /**
     * Get the websites using this Node.js version.
     */
    public function websites(): HasMany
    {
        return $this->hasMany(Website::class);
    }

    /**
     * Scope to get only active versions.
     */
    public function scopeActive($query)
    {
        return $query->where('active', true);
    }

    /**
     * Get the default Node.js version.
     */
    public static function getDefault(): ?self
    {
        return static::where('is_default', true)->first()
            ?? static::active()->first();
    }

    /**
     * Get display label for the version.
     */
    public function getLabelAttribute(): string
    {
        return "Node.js {$this->version}" . ($this->full_version ? " ({$this->full_version})" : '');
    }
}
