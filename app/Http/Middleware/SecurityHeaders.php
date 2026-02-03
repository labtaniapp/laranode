<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    /**
     * Security headers to add to all responses.
     */
    protected array $headers = [
        // Prevent clickjacking attacks
        'X-Frame-Options' => 'SAMEORIGIN',

        // Prevent MIME type sniffing
        'X-Content-Type-Options' => 'nosniff',

        // Enable XSS filter in older browsers
        'X-XSS-Protection' => '1; mode=block',

        // Control referrer information
        'Referrer-Policy' => 'strict-origin-when-cross-origin',

        // Prevent browsers from accessing certain features
        'Permissions-Policy' => 'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    ];

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        // Add security headers
        foreach ($this->headers as $key => $value) {
            $response->headers->set($key, $value);
        }

        // Add Content-Security-Policy (more permissive for panel functionality)
        $csp = $this->buildContentSecurityPolicy();
        $response->headers->set('Content-Security-Policy', $csp);

        // Add Strict-Transport-Security for HTTPS
        if ($request->secure() || config('app.env') === 'production') {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains'
            );
        }

        return $response;
    }

    /**
     * Build Content-Security-Policy header.
     */
    protected function buildContentSecurityPolicy(): string
    {
        $directives = [
            // Default source
            "default-src 'self'",

            // Scripts - allow self, inline (for Inertia/React), and eval (for some React features)
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'",

            // Styles - allow self and inline (for Tailwind and component styles)
            "style-src 'self' 'unsafe-inline'",

            // Images - allow self, data URIs (for inline images), and Google Charts (for QR codes)
            "img-src 'self' data: https://chart.googleapis.com",

            // Fonts
            "font-src 'self' data:",

            // Form actions
            "form-action 'self'",

            // Frame ancestors (same as X-Frame-Options)
            "frame-ancestors 'self'",

            // Base URI
            "base-uri 'self'",

            // Connect - for API calls and websockets
            "connect-src 'self' wss: ws:",

            // Object source (block plugins)
            "object-src 'none'",
        ];

        return implode('; ', $directives);
    }
}
