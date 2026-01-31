<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Str;

class GitRepository extends Model
{
    protected $fillable = [
        'website_id',
        'user_id',
        'provider',
        'repository_url',
        'branch',
        'deploy_key',
        'webhook_secret',
        'auto_deploy',
        'deploy_script',
        'framework',
        'zero_downtime',
        'keep_releases',
        'environment_variables',
        'last_deployed_at',
    ];

    protected $casts = [
        'auto_deploy' => 'boolean',
        'zero_downtime' => 'boolean',
        'keep_releases' => 'integer',
        'environment_variables' => 'array',
        'last_deployed_at' => 'datetime',
    ];

    protected $hidden = [
        'deploy_key',
        'webhook_secret',
    ];

    /**
     * Get the website.
     */
    public function website(): BelongsTo
    {
        return $this->belongsTo(Website::class);
    }

    /**
     * Get the user.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get deployments.
     */
    public function deployments(): HasMany
    {
        return $this->hasMany(Deployment::class);
    }

    /**
     * Get latest deployment.
     */
    public function latestDeployment()
    {
        return $this->hasOne(Deployment::class)->latestOfMany();
    }

    /**
     * Encrypt deploy key when setting.
     */
    public function setDeployKeyAttribute($value): void
    {
        if ($value) {
            $this->attributes['deploy_key'] = Crypt::encryptString($value);
        } else {
            $this->attributes['deploy_key'] = null;
        }
    }

    /**
     * Decrypt deploy key.
     */
    public function getDeployKeyDecryptedAttribute(): ?string
    {
        if ($this->deploy_key) {
            try {
                return Crypt::decryptString($this->deploy_key);
            } catch (\Exception $e) {
                return null;
            }
        }
        return null;
    }

    /**
     * Generate webhook secret.
     */
    public function generateWebhookSecret(): string
    {
        $secret = Str::random(40);
        $this->webhook_secret = $secret;
        $this->save();
        return $secret;
    }

    /**
     * Get webhook URL.
     */
    public function getWebhookUrlAttribute(): string
    {
        return route('git.webhook', ['repository' => $this->id, 'secret' => $this->webhook_secret]);
    }

    /**
     * Get repository name from URL.
     */
    public function getRepositoryNameAttribute(): string
    {
        $url = $this->repository_url;

        // Handle SSH URLs like git@github.com:user/repo.git
        if (Str::startsWith($url, 'git@')) {
            $url = Str::after($url, ':');
        }

        // Handle HTTPS URLs
        $url = Str::after($url, '//');
        $url = Str::after($url, '/');

        // Remove .git suffix
        return Str::replaceLast('.git', '', $url);
    }

    /**
     * Get provider icon.
     */
    public function getProviderIconAttribute(): string
    {
        return match($this->provider) {
            'github' => 'FaGithub',
            'gitlab' => 'FaGitlab',
            'bitbucket' => 'FaBitbucket',
            default => 'FaGit',
        };
    }

    /**
     * Get default deploy script for framework.
     */
    public static function getDefaultDeployScript(string $framework): string
    {
        return match($framework) {
            'laravel' => implode("\n", [
                'composer install --no-dev --optimize-autoloader',
                'php artisan migrate --force',
                'php artisan config:cache',
                'php artisan route:cache',
                'php artisan view:cache',
                'npm ci',
                'npm run build',
            ]),
            'nodejs' => implode("\n", [
                'npm ci',
                'npm run build',
                'pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production',
            ]),
            'nuxt' => implode("\n", [
                'npm ci',
                'npm run build',
                'pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production',
            ]),
            'nextjs' => implode("\n", [
                'npm ci',
                'npm run build',
                'pm2 restart ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production',
            ]),
            'static' => implode("\n", [
                'npm ci',
                'npm run build',
            ]),
            default => '# Add your custom deploy commands here',
        };
    }

    /**
     * Scope for user's repositories.
     */
    public function scopeMine($query)
    {
        return $query->where('user_id', auth()->id());
    }
}
