<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Deployment extends Model
{
    protected $fillable = [
        'git_repository_id',
        'user_id',
        'commit_hash',
        'commit_message',
        'commit_author',
        'branch',
        'status',
        'trigger',
        'log',
        'error_message',
        'release_path',
        'duration',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'duration' => 'integer',
    ];

    /**
     * Get the git repository.
     */
    public function gitRepository(): BelongsTo
    {
        return $this->belongsTo(GitRepository::class);
    }

    /**
     * Get the user.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get short commit hash.
     */
    public function getShortCommitHashAttribute(): ?string
    {
        return $this->commit_hash ? substr($this->commit_hash, 0, 7) : null;
    }

    /**
     * Get formatted duration.
     */
    public function getFormattedDurationAttribute(): ?string
    {
        if (!$this->duration) {
            return null;
        }

        if ($this->duration < 60) {
            return $this->duration . 's';
        }

        $minutes = floor($this->duration / 60);
        $seconds = $this->duration % 60;

        return "{$minutes}m {$seconds}s";
    }

    /**
     * Check if deployment is in progress.
     */
    public function isInProgress(): bool
    {
        return in_array($this->status, ['pending', 'cloning', 'building', 'deploying']);
    }

    /**
     * Check if deployment can be rolled back to.
     */
    public function canRollbackTo(): bool
    {
        return $this->status === 'completed' && $this->release_path && file_exists($this->release_path);
    }

    /**
     * Get status color.
     */
    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'pending' => 'yellow',
            'cloning' => 'blue',
            'building' => 'blue',
            'deploying' => 'blue',
            'completed' => 'green',
            'failed' => 'red',
            'rolled_back' => 'orange',
            default => 'gray',
        };
    }

    /**
     * Get status label.
     */
    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'pending' => 'Pending',
            'cloning' => 'Cloning',
            'building' => 'Building',
            'deploying' => 'Deploying',
            'completed' => 'Completed',
            'failed' => 'Failed',
            'rolled_back' => 'Rolled Back',
            default => ucfirst($this->status),
        };
    }

    /**
     * Append log message.
     */
    public function appendLog(string $message): void
    {
        $timestamp = now()->format('H:i:s');
        $this->log = ($this->log ?? '') . "[{$timestamp}] {$message}\n";
        $this->save();
    }

    /**
     * Mark as started.
     */
    public function markAsStarted(): void
    {
        $this->started_at = now();
        $this->status = 'cloning';
        $this->save();
    }

    /**
     * Mark as completed.
     */
    public function markAsCompleted(): void
    {
        $this->status = 'completed';
        $this->completed_at = now();
        $this->duration = $this->started_at ? $this->started_at->diffInSeconds($this->completed_at) : null;
        $this->save();

        // Update repository last deployed
        $this->gitRepository->update(['last_deployed_at' => now()]);
    }

    /**
     * Mark as failed.
     */
    public function markAsFailed(string $error): void
    {
        $this->status = 'failed';
        $this->error_message = $error;
        $this->completed_at = now();
        $this->duration = $this->started_at ? $this->started_at->diffInSeconds($this->completed_at) : null;
        $this->save();
    }

    /**
     * Scope for user's deployments.
     */
    public function scopeMine($query)
    {
        return $query->where('user_id', auth()->id());
    }
}
