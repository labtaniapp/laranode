<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Backup extends Model
{
    protected $fillable = [
        'website_id',
        'user_id',
        'name',
        'filename',
        'path',
        'storage',
        'size',
        'includes_files',
        'includes_database',
        'status',
        'error_message',
        'completed_at',
    ];

    protected $casts = [
        'includes_files' => 'boolean',
        'includes_database' => 'boolean',
        'size' => 'integer',
        'completed_at' => 'datetime',
    ];

    /**
     * Get the website that owns the backup.
     */
    public function website(): BelongsTo
    {
        return $this->belongsTo(Website::class);
    }

    /**
     * Get the user that owns the backup.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Scope for user's backups.
     */
    public function scopeMine($query)
    {
        $user = auth()->user();
        if ($user->role !== 'admin') {
            return $query->where('user_id', $user->id);
        }
        return $query;
    }

    /**
     * Get human-readable size.
     */
    public function getFormattedSizeAttribute(): string
    {
        $bytes = $this->size;

        if ($bytes >= 1073741824) {
            return round($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return round($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return round($bytes / 1024, 2) . ' KB';
        }

        return $bytes . ' B';
    }

    /**
     * Check if backup is downloadable.
     */
    public function isDownloadable(): bool
    {
        return $this->status === 'completed' && $this->storage === 'local';
    }

    /**
     * Check if backup is restorable.
     */
    public function isRestorable(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Get full path to backup file.
     */
    public function getFullPathAttribute(): string
    {
        return $this->path . '/' . $this->filename;
    }
}
