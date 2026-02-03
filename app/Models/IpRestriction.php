<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Cache;

class IpRestriction extends Model
{
    protected $fillable = [
        'ip_address',
        'type',
        'scope',
        'reason',
        'created_by',
        'expires_at',
        'is_active',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    const TYPE_WHITELIST = 'whitelist';
    const TYPE_BLACKLIST = 'blacklist';

    const SCOPE_GLOBAL = 'global';
    const SCOPE_ADMIN = 'admin';
    const SCOPE_LOGIN = 'login';

    const CACHE_KEY = 'ip_restrictions';
    const CACHE_TTL = 300; // 5 minutes

    /**
     * User who created this restriction.
     */
    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Scope: Active restrictions only.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            });
    }

    /**
     * Scope: Blacklisted IPs.
     */
    public function scopeBlacklist($query)
    {
        return $query->where('type', self::TYPE_BLACKLIST);
    }

    /**
     * Scope: Whitelisted IPs.
     */
    public function scopeWhitelist($query)
    {
        return $query->where('type', self::TYPE_WHITELIST);
    }

    /**
     * Check if an IP is whitelisted.
     */
    public static function isWhitelisted(string $ip, string $scope = 'global'): bool
    {
        $restrictions = self::getCachedRestrictions();

        foreach ($restrictions as $restriction) {
            if ($restriction['type'] !== self::TYPE_WHITELIST) {
                continue;
            }

            if (!in_array($restriction['scope'], [$scope, self::SCOPE_GLOBAL])) {
                continue;
            }

            if (self::ipMatches($ip, $restriction['ip_address'])) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if an IP is blacklisted.
     */
    public static function isBlacklisted(string $ip, string $scope = 'global'): ?array
    {
        // If there's a whitelist and IP is whitelisted, not blocked
        if (self::isWhitelisted($ip, $scope)) {
            return null;
        }

        $restrictions = self::getCachedRestrictions();

        foreach ($restrictions as $restriction) {
            if ($restriction['type'] !== self::TYPE_BLACKLIST) {
                continue;
            }

            if (!in_array($restriction['scope'], [$scope, self::SCOPE_GLOBAL])) {
                continue;
            }

            if (self::ipMatches($ip, $restriction['ip_address'])) {
                return $restriction;
            }
        }

        return null;
    }

    /**
     * Check if IP matches a pattern (supports CIDR notation).
     */
    public static function ipMatches(string $ip, string $pattern): bool
    {
        // Exact match
        if ($ip === $pattern) {
            return true;
        }

        // Wildcard match (e.g., 192.168.1.*)
        if (str_contains($pattern, '*')) {
            $regex = '/^' . str_replace(['.', '*'], ['\.', '\d+'], $pattern) . '$/';
            return (bool) preg_match($regex, $ip);
        }

        // CIDR match (e.g., 192.168.1.0/24)
        if (str_contains($pattern, '/')) {
            return self::ipMatchesCidr($ip, $pattern);
        }

        return false;
    }

    /**
     * Check if IP matches CIDR range.
     */
    protected static function ipMatchesCidr(string $ip, string $cidr): bool
    {
        [$subnet, $mask] = explode('/', $cidr);

        // IPv4
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
            $ipLong = ip2long($ip);
            $subnetLong = ip2long($subnet);
            $maskLong = -1 << (32 - (int)$mask);

            return ($ipLong & $maskLong) === ($subnetLong & $maskLong);
        }

        // IPv6 - simplified check
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
            $ipBin = inet_pton($ip);
            $subnetBin = inet_pton($subnet);

            if ($ipBin === false || $subnetBin === false) {
                return false;
            }

            $maskInt = (int)$mask;
            $bytes = floor($maskInt / 8);
            $bits = $maskInt % 8;

            // Compare full bytes
            for ($i = 0; $i < $bytes; $i++) {
                if ($ipBin[$i] !== $subnetBin[$i]) {
                    return false;
                }
            }

            // Compare remaining bits
            if ($bits > 0 && $bytes < 16) {
                $mask = (0xFF << (8 - $bits)) & 0xFF;
                if ((ord($ipBin[$bytes]) & $mask) !== (ord($subnetBin[$bytes]) & $mask)) {
                    return false;
                }
            }

            return true;
        }

        return false;
    }

    /**
     * Get cached restrictions.
     */
    public static function getCachedRestrictions(): array
    {
        return Cache::remember(self::CACHE_KEY, self::CACHE_TTL, function () {
            return self::active()
                ->get()
                ->map(fn($r) => [
                    'id' => $r->id,
                    'ip_address' => $r->ip_address,
                    'type' => $r->type,
                    'scope' => $r->scope,
                    'reason' => $r->reason,
                ])
                ->toArray();
        });
    }

    /**
     * Clear the restrictions cache.
     */
    public static function clearCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }

    /**
     * Boot the model.
     */
    protected static function booted()
    {
        static::saved(fn() => self::clearCache());
        static::deleted(fn() => self::clearCache());
    }

    /**
     * Log a blocked attempt.
     */
    public static function logBlockedAttempt(string $ip, string $reason, ?string $url = null, ?string $userAgent = null): void
    {
        \DB::table('ip_block_logs')->insert([
            'ip_address' => $ip,
            'reason' => $reason,
            'url' => $url,
            'user_agent' => $userAgent,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Also log to activity log
        ActivityLog::log(
            'ip_blocked',
            ActivityLog::CATEGORY_SECURITY,
            "Blocked IP: {$ip} - {$reason}",
            null,
            ['ip' => $ip, 'reason' => $reason, 'url' => $url],
            ActivityLog::SEVERITY_WARNING
        );
    }

    /**
     * Add IP to blacklist.
     */
    public static function blacklist(
        string $ip,
        string $reason,
        string $scope = 'global',
        ?int $expiresInMinutes = null
    ): self {
        $restriction = self::create([
            'ip_address' => $ip,
            'type' => self::TYPE_BLACKLIST,
            'scope' => $scope,
            'reason' => $reason,
            'created_by' => auth()->id(),
            'expires_at' => $expiresInMinutes ? now()->addMinutes($expiresInMinutes) : null,
        ]);

        ActivityLog::logSecurity(
            'ip_blacklist',
            "Added {$ip} to blacklist: {$reason}",
            $restriction
        );

        return $restriction;
    }

    /**
     * Add IP to whitelist.
     */
    public static function whitelist(string $ip, string $reason, string $scope = 'global'): self
    {
        $restriction = self::create([
            'ip_address' => $ip,
            'type' => self::TYPE_WHITELIST,
            'scope' => $scope,
            'reason' => $reason,
            'created_by' => auth()->id(),
        ]);

        ActivityLog::logSecurity(
            'ip_whitelist',
            "Added {$ip} to whitelist: {$reason}",
            $restriction
        );

        return $restriction;
    }
}
