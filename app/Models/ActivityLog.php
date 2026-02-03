<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class ActivityLog extends Model
{
    protected $fillable = [
        'user_id',
        'action',
        'category',
        'subject_type',
        'subject_id',
        'description',
        'properties',
        'ip_address',
        'user_agent',
        'severity',
    ];

    protected $casts = [
        'properties' => 'array',
    ];

    // Categories
    const CATEGORY_AUTH = 'auth';
    const CATEGORY_USER = 'user';
    const CATEGORY_WEBSITE = 'website';
    const CATEGORY_DATABASE = 'database';
    const CATEGORY_EMAIL = 'email';
    const CATEGORY_SECURITY = 'security';
    const CATEGORY_SYSTEM = 'system';
    const CATEGORY_FIREWALL = 'firewall';
    const CATEGORY_BACKUP = 'backup';

    // Actions
    const ACTION_LOGIN = 'login';
    const ACTION_LOGOUT = 'logout';
    const ACTION_LOGIN_FAILED = 'login_failed';
    const ACTION_CREATE = 'create';
    const ACTION_UPDATE = 'update';
    const ACTION_DELETE = 'delete';
    const ACTION_ENABLE = 'enable';
    const ACTION_DISABLE = 'disable';
    const ACTION_PASSWORD_CHANGE = 'password_change';
    const ACTION_2FA_ENABLE = '2fa_enable';
    const ACTION_2FA_DISABLE = '2fa_disable';
    const ACTION_IMPERSONATE = 'impersonate';

    // Severities
    const SEVERITY_INFO = 'info';
    const SEVERITY_WARNING = 'warning';
    const SEVERITY_ERROR = 'error';
    const SEVERITY_CRITICAL = 'critical';

    /**
     * User relationship.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the subject of the activity.
     */
    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Log an activity.
     */
    public static function log(
        string $action,
        string $category,
        string $description,
        ?Model $subject = null,
        array $properties = [],
        string $severity = self::SEVERITY_INFO,
        ?User $user = null
    ): self {
        return self::create([
            'user_id' => $user?->id ?? Auth::id(),
            'action' => $action,
            'category' => $category,
            'subject_type' => $subject ? get_class($subject) : null,
            'subject_id' => $subject?->id,
            'description' => $description,
            'properties' => $properties,
            'ip_address' => Request::ip(),
            'user_agent' => Request::userAgent(),
            'severity' => $severity,
        ]);
    }

    /**
     * Log authentication events.
     */
    public static function logAuth(string $action, string $description, ?User $user = null, array $properties = []): self
    {
        $severity = $action === self::ACTION_LOGIN_FAILED ? self::SEVERITY_WARNING : self::SEVERITY_INFO;

        return self::log($action, self::CATEGORY_AUTH, $description, $user, $properties, $severity, $user);
    }

    /**
     * Log security events.
     */
    public static function logSecurity(string $action, string $description, ?Model $subject = null, array $properties = []): self
    {
        return self::log($action, self::CATEGORY_SECURITY, $description, $subject, $properties, self::SEVERITY_WARNING);
    }

    /**
     * Log system events.
     */
    public static function logSystem(string $action, string $description, array $properties = [], string $severity = self::SEVERITY_INFO): self
    {
        return self::log($action, self::CATEGORY_SYSTEM, $description, null, $properties, $severity);
    }

    /**
     * Get logs for a specific user.
     */
    public static function forUser(int $userId, int $limit = 50)
    {
        return self::where('user_id', $userId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get recent security events.
     */
    public static function recentSecurityEvents(int $limit = 20)
    {
        return self::where('category', self::CATEGORY_SECURITY)
            ->orWhere('severity', self::SEVERITY_CRITICAL)
            ->orWhere('severity', self::SEVERITY_ERROR)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get login history for a user.
     */
    public static function loginHistory(int $userId, int $limit = 10)
    {
        return self::where('user_id', $userId)
            ->whereIn('action', [self::ACTION_LOGIN, self::ACTION_LOGIN_FAILED])
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Clean old logs.
     */
    public static function cleanOldLogs(int $daysToKeep = 90): int
    {
        return self::where('created_at', '<', now()->subDays($daysToKeep))->delete();
    }

    /**
     * Get formatted properties for display.
     */
    public function getFormattedPropertiesAttribute(): array
    {
        if (!$this->properties) {
            return [];
        }

        $formatted = [];
        foreach ($this->properties as $key => $value) {
            $formatted[] = [
                'key' => ucfirst(str_replace('_', ' ', $key)),
                'value' => is_array($value) ? json_encode($value) : $value,
            ];
        }

        return $formatted;
    }

    /**
     * Get severity color for UI.
     */
    public function getSeverityColorAttribute(): string
    {
        return match ($this->severity) {
            self::SEVERITY_INFO => 'blue',
            self::SEVERITY_WARNING => 'yellow',
            self::SEVERITY_ERROR => 'red',
            self::SEVERITY_CRITICAL => 'red',
            default => 'gray',
        };
    }

    /**
     * Get category icon for UI.
     */
    public function getCategoryIconAttribute(): string
    {
        return match ($this->category) {
            self::CATEGORY_AUTH => 'TbLogin',
            self::CATEGORY_USER => 'TbUser',
            self::CATEGORY_WEBSITE => 'TbWorld',
            self::CATEGORY_DATABASE => 'TbDatabase',
            self::CATEGORY_EMAIL => 'TbMail',
            self::CATEGORY_SECURITY => 'TbShieldLock',
            self::CATEGORY_SYSTEM => 'TbServer',
            self::CATEGORY_FIREWALL => 'TbShield',
            self::CATEGORY_BACKUP => 'TbCloudUpload',
            default => 'TbActivity',
        };
    }
}
