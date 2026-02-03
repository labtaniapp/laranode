<?php

namespace App\Http\Controllers;

use App\Models\IpRestriction;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class IpRestrictionController extends Controller
{
    /**
     * Display IP restrictions management page.
     */
    public function index()
    {
        $restrictions = IpRestriction::with('createdBy')
            ->orderBy('created_at', 'desc')
            ->get();

        $blockedAttempts = \DB::table('ip_block_logs')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get();

        return Inertia::render('Admin/IpRestrictions', [
            'restrictions' => $restrictions,
            'blockedAttempts' => $blockedAttempts,
        ]);
    }

    /**
     * Get restrictions as JSON.
     */
    public function list(Request $request)
    {
        $query = IpRestriction::with('createdBy');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('scope')) {
            $query->where('scope', $request->scope);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    /**
     * Store a new IP restriction.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'ip_address' => ['required', 'string', 'max:45'],
            'type' => ['required', Rule::in(['whitelist', 'blacklist'])],
            'scope' => ['required', Rule::in(['global', 'admin', 'login'])],
            'reason' => ['nullable', 'string', 'max:255'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);

        // Validate IP format (allow wildcards and CIDR)
        if (!$this->isValidIpPattern($validated['ip_address'])) {
            return back()->withErrors(['ip_address' => 'Invalid IP address format.']);
        }

        // Check if restriction already exists
        $existing = IpRestriction::where('ip_address', $validated['ip_address'])
            ->where('type', $validated['type'])
            ->where('scope', $validated['scope'])
            ->where('is_active', true)
            ->first();

        if ($existing) {
            return back()->withErrors(['ip_address' => 'This IP restriction already exists.']);
        }

        $restriction = IpRestriction::create([
            ...$validated,
            'created_by' => auth()->id(),
        ]);

        return back()->with('success', 'IP restriction added successfully.');
    }

    /**
     * Update an IP restriction.
     */
    public function update(Request $request, IpRestriction $restriction)
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:255'],
            'expires_at' => ['nullable', 'date'],
            'is_active' => ['boolean'],
        ]);

        $restriction->update($validated);

        return back()->with('success', 'IP restriction updated successfully.');
    }

    /**
     * Delete an IP restriction.
     */
    public function destroy(IpRestriction $restriction)
    {
        $restriction->delete();

        return back()->with('success', 'IP restriction removed successfully.');
    }

    /**
     * Check current user's IP status.
     */
    public function checkMyIp(Request $request)
    {
        $ip = $request->ip();

        return response()->json([
            'ip' => $ip,
            'is_whitelisted' => IpRestriction::isWhitelisted($ip),
            'is_blacklisted' => IpRestriction::isBlacklisted($ip) !== null,
        ]);
    }

    /**
     * Quick block an IP.
     */
    public function quickBlock(Request $request)
    {
        $validated = $request->validate([
            'ip_address' => ['required', 'string', 'max:45'],
            'reason' => ['required', 'string', 'max:255'],
            'duration' => ['nullable', 'integer', 'min:1'], // Minutes
        ]);

        if (!$this->isValidIpPattern($validated['ip_address'])) {
            return response()->json(['error' => 'Invalid IP address format.'], 422);
        }

        $restriction = IpRestriction::blacklist(
            $validated['ip_address'],
            $validated['reason'],
            'global',
            $validated['duration'] ?? null
        );

        return response()->json([
            'success' => true,
            'restriction' => $restriction,
        ]);
    }

    /**
     * Get blocked attempts statistics.
     */
    public function stats()
    {
        $today = now()->startOfDay();
        $thisWeek = now()->startOfWeek();

        return response()->json([
            'total_restrictions' => IpRestriction::active()->count(),
            'blacklisted' => IpRestriction::active()->blacklist()->count(),
            'whitelisted' => IpRestriction::active()->whitelist()->count(),
            'blocked_today' => \DB::table('ip_block_logs')
                ->where('created_at', '>=', $today)
                ->count(),
            'blocked_this_week' => \DB::table('ip_block_logs')
                ->where('created_at', '>=', $thisWeek)
                ->count(),
            'top_blocked_ips' => \DB::table('ip_block_logs')
                ->select('ip_address', \DB::raw('count(*) as count'))
                ->where('created_at', '>=', $thisWeek)
                ->groupBy('ip_address')
                ->orderByDesc('count')
                ->limit(10)
                ->get(),
        ]);
    }

    /**
     * Clear blocked attempts log.
     */
    public function clearLogs(Request $request)
    {
        $days = $request->get('days', 30);

        $deleted = \DB::table('ip_block_logs')
            ->where('created_at', '<', now()->subDays($days))
            ->delete();

        return response()->json([
            'success' => true,
            'deleted' => $deleted,
        ]);
    }

    /**
     * Validate IP pattern (IP, CIDR, or wildcard).
     */
    protected function isValidIpPattern(string $pattern): bool
    {
        // Exact IPv4 or IPv6
        if (filter_var($pattern, FILTER_VALIDATE_IP)) {
            return true;
        }

        // Wildcard pattern (e.g., 192.168.1.*)
        if (str_contains($pattern, '*')) {
            $regex = str_replace(['.', '*'], ['\.', '\d+'], $pattern);
            return (bool) preg_match('/^\d+(\.\d+|\.\*){3}$/', $pattern);
        }

        // CIDR notation (e.g., 192.168.1.0/24)
        if (str_contains($pattern, '/')) {
            [$ip, $mask] = explode('/', $pattern);

            if (!filter_var($ip, FILTER_VALIDATE_IP)) {
                return false;
            }

            $maskInt = (int) $mask;

            // IPv4 mask: 0-32, IPv6 mask: 0-128
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)) {
                return $maskInt >= 0 && $maskInt <= 32;
            }

            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6)) {
                return $maskInt >= 0 && $maskInt <= 128;
            }
        }

        return false;
    }
}
