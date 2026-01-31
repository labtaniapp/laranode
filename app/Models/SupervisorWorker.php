<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SupervisorWorker extends Model
{
    protected $fillable = [
        'website_id',
        'name',
        'command',
        'directory',
        'user',
        'numprocs',
        'autostart',
        'autorestart',
        'startsecs',
        'stopwaitsecs',
        'stdout_logfile',
        'stderr_logfile',
        'status',
        'last_started_at',
        'last_stopped_at',
    ];

    protected $casts = [
        'numprocs' => 'integer',
        'autostart' => 'boolean',
        'autorestart' => 'boolean',
        'startsecs' => 'integer',
        'stopwaitsecs' => 'integer',
        'last_started_at' => 'datetime',
        'last_stopped_at' => 'datetime',
    ];

    /**
     * Common Laravel worker presets
     */
    public const PRESETS = [
        'queue-worker' => [
            'name' => 'queue-worker',
            'command' => 'php artisan queue:work --sleep=3 --tries=3 --max-time=3600',
            'description' => 'Laravel Queue Worker',
        ],
        'horizon' => [
            'name' => 'horizon',
            'command' => 'php artisan horizon',
            'description' => 'Laravel Horizon',
        ],
        'reverb' => [
            'name' => 'reverb',
            'command' => 'php artisan reverb:start',
            'description' => 'Laravel Reverb WebSockets',
        ],
        'scheduler' => [
            'name' => 'scheduler',
            'command' => 'php artisan schedule:work',
            'description' => 'Laravel Scheduler',
        ],
        'octane' => [
            'name' => 'octane',
            'command' => 'php artisan octane:start --server=swoole --host=127.0.0.1 --port=8000',
            'description' => 'Laravel Octane',
        ],
    ];

    /**
     * Get the website that owns this worker.
     */
    public function website(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Website::class);
    }

    /**
     * Get the supervisor program name (unique identifier).
     */
    public function getProgramNameAttribute(): string
    {
        return 'laranode-' . $this->website_id . '-' . $this->name;
    }

    /**
     * Get the supervisor config file path.
     */
    public function getConfigFilePathAttribute(): string
    {
        return '/etc/supervisor/conf.d/laranode/' . $this->program_name . '.conf';
    }

    /**
     * Get the log file path for stdout.
     */
    public function getStdoutLogPathAttribute(): string
    {
        return $this->stdout_logfile ?? $this->website->basePath . '/logs/worker-' . $this->name . '.log';
    }

    /**
     * Get the log file path for stderr.
     */
    public function getStderrLogPathAttribute(): string
    {
        return $this->stderr_logfile ?? $this->website->basePath . '/logs/worker-' . $this->name . '-error.log';
    }

    /**
     * Generate supervisor configuration content.
     */
    public function generateConfig(): string
    {
        $config = "[program:{$this->program_name}]\n";
        $config .= "command={$this->command}\n";
        $config .= "directory=" . ($this->directory ?? $this->website->basePath) . "\n";
        $config .= "user={$this->user}\n";
        $config .= "numprocs={$this->numprocs}\n";
        $config .= "autostart=" . ($this->autostart ? 'true' : 'false') . "\n";
        $config .= "autorestart=" . ($this->autorestart ? 'true' : 'false') . "\n";
        $config .= "startsecs={$this->startsecs}\n";
        $config .= "stopwaitsecs={$this->stopwaitsecs}\n";
        $config .= "stdout_logfile={$this->stdout_log_path}\n";
        $config .= "stderr_logfile={$this->stderr_log_path}\n";
        $config .= "stdout_logfile_maxbytes=10MB\n";
        $config .= "stderr_logfile_maxbytes=10MB\n";

        if ($this->numprocs > 1) {
            $config .= "process_name=%(program_name)s_%(process_num)02d\n";
        }

        return $config;
    }

    /**
     * Check if worker is running.
     */
    public function isRunning(): bool
    {
        return $this->status === 'running';
    }

    /**
     * Check if worker has fatal error.
     */
    public function isFatal(): bool
    {
        return $this->status === 'fatal';
    }

    /**
     * Get status badge color.
     */
    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'running' => 'green',
            'stopped' => 'gray',
            'starting' => 'yellow',
            'stopping' => 'yellow',
            'fatal' => 'red',
            default => 'gray',
        };
    }
}
