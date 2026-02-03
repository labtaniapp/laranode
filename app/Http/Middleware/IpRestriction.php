<?php

namespace App\Http\Middleware;

use App\Models\IpRestriction as IpRestrictionModel;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IpRestriction
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next, string $scope = 'global'): Response
    {
        $ip = $request->ip();

        // Check if IP is blacklisted
        $blocked = IpRestrictionModel::isBlacklisted($ip, $scope);

        if ($blocked) {
            // Log the blocked attempt
            IpRestrictionModel::logBlockedAttempt(
                $ip,
                $blocked['reason'] ?? 'Blacklisted',
                $request->fullUrl(),
                $request->userAgent()
            );

            // Return 403 Forbidden
            if ($request->expectsJson()) {
                return response()->json([
                    'error' => 'Access denied',
                    'message' => 'Your IP address has been blocked.',
                ], 403);
            }

            abort(403, 'Your IP address has been blocked. Contact the administrator if you believe this is an error.');
        }

        return $next($request);
    }
}
