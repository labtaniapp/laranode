<?php

namespace App\Models;

use App\Enums\ApplicationType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class Website extends Model
{

    protected $appends = ['fullDocumentRoot', 'basePath'];

    protected $casts = [
        'ssl_enabled' => 'boolean',
        'ssl_expires_at' => 'datetime',
        'ssl_generated_at' => 'datetime',
        'application_type' => ApplicationType::class,
        'environment_variables' => 'array',
        'instances' => 'integer',
        'app_port' => 'integer',
    ];

    protected $fillable = [
        'url',
        'document_root',
        'website_root',
        'application_type',
        'php_version_id',
        'node_version_id',
        'startup_file',
        'app_port',
        'instances',
        'environment_variables',
        'ssl_enabled',
        'ssl_status',
        'ssl_expires_at',
        'ssl_generated_at',
    ];

    public function getWebsiteRootAttribute(): string
    {
        return $this->user?->homedir . '/domains/' . $this->url;
    }

    // not using casts as it's not working in some scenarios
    public function getFullDocumentRootAttribute(): string
    {
        return $this->user?->homedir . '/domains/' . $this->url . $this->document_root;
    }

    /**
     * Get the base path for the website (alias for website_root).
     */
    public function getBasePathAttribute(): string
    {
        return $this->user?->homedir . '/domains/' . $this->url;
    }

    public function scopeMine(Builder $query): Builder
    {
        $user = auth()->user();
        return $query->when($user && !$user->isAdmin(), fn($query) => $query->where('user_id', $user->id));
    }

    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class)->select(['id', 'username', 'role']);
    }

    public function phpVersion(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(PhpVersion::class);
    }

    public function nodeVersion(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(NodeVersion::class);
    }

    /**
     * Get the databases associated with this website.
     */
    public function databases(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(Database::class);
    }

    /**
     * Get the cron jobs associated with this website.
     */
    public function cronJobs(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(CronJob::class);
    }

    /**
     * Get the supervisor workers associated with this website.
     */
    public function supervisorWorkers(): \Illuminate\Database\Eloquent\Relations\HasMany
    {
        return $this->hasMany(SupervisorWorker::class);
    }

    /**
     * Check if this is a PHP application.
     */
    public function isPhp(): bool
    {
        return $this->application_type === ApplicationType::PHP;
    }

    /**
     * Check if this is a Node.js application.
     */
    public function isNodeJs(): bool
    {
        return $this->application_type === ApplicationType::NodeJS;
    }

    /**
     * Check if this is a static site.
     */
    public function isStatic(): bool
    {
        return $this->application_type === ApplicationType::Static;
    }

    /**
     * Check if this application requires a reverse proxy.
     */
    public function requiresReverseProxy(): bool
    {
        return $this->application_type?->usesReverseProxy() ?? false;
    }

    /**
     * Get the application type label for display.
     */
    public function getApplicationTypeLabelAttribute(): string
    {
        return $this->application_type?->label() ?? 'Unknown';
    }

    /**
     * Get the PM2 process name for this site.
     */
    public function getPm2ProcessNameAttribute(): string
    {
        return str_replace('.', '-', $this->url);
    }

    /**
     * Check if SSL certificate is active and valid
     */
    public function isSslActive(): bool
    {
        return $this->ssl_enabled && $this->ssl_status === 'active';
    }

    /**
     * Check if SSL certificate is expired
     */
    public function isSslExpired(): bool
    {
        return $this->ssl_status === 'expired' || 
               ($this->ssl_expires_at && $this->ssl_expires_at->isPast());
    }

    /**
     * Get SSL status display text
     */
    public function getSslStatusText(): string
    {
        return match($this->ssl_status) {
            'active' => 'SSL Active',
            'expired' => 'SSL Expired',
            'pending' => 'SSL Pending',
            default => 'SSL Inactive'
        };
    }

    /**
     * Get SSL status color class for frontend
     */
    public function getSslStatusColor(): string
    {
        return match($this->ssl_status) {
            'active' => 'text-green-600',
            'expired' => 'text-red-600',
            'pending' => 'text-yellow-600',
            default => 'text-gray-500'
        };
    }
}
