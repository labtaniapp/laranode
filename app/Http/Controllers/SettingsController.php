<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Process;
use Inertia\Inertia;

class SettingsController extends Controller
{
    /**
     * Display the settings page.
     */
    public function index()
    {
        $settings = $this->getCurrentSettings();

        return Inertia::render('Settings/Index', [
            'settings' => $settings,
        ]);
    }

    /**
     * Update the application settings.
     */
    public function update(Request $request)
    {
        $validated = $request->validate([
            'app_name' => 'required|string|max:255',
            'app_url' => 'required|url|max:255',
            'app_timezone' => 'required|string|max:100',
            'app_debug' => 'required|boolean',
        ]);

        $envPath = base_path('.env');

        if (!file_exists($envPath)) {
            return back()->withErrors(['error' => '.env file not found']);
        }

        $envContent = file_get_contents($envPath);

        // Update each setting
        $envContent = $this->updateEnvValue($envContent, 'APP_NAME', $validated['app_name']);
        $envContent = $this->updateEnvValue($envContent, 'APP_URL', $validated['app_url']);
        $envContent = $this->updateEnvValue($envContent, 'APP_TIMEZONE', $validated['app_timezone']);
        $envContent = $this->updateEnvValue($envContent, 'APP_DEBUG', $validated['app_debug'] ? 'true' : 'false');

        // Extract host from URL for Reverb
        $parsedUrl = parse_url($validated['app_url']);
        $host = $parsedUrl['host'] ?? '';

        if ($host) {
            $envContent = $this->updateEnvValue($envContent, 'REVERB_HOST', $host);
            $envContent = $this->updateEnvValue($envContent, 'VITE_REVERB_HOST', $host);
        }

        // Write the updated content
        file_put_contents($envPath, $envContent);

        // Clear config cache
        Artisan::call('config:clear');

        // Check if URL changed - need to rebuild assets
        $oldUrl = config('app.url');
        $needsRebuild = $oldUrl !== $validated['app_url'];

        if ($needsRebuild) {
            // Run rebuild in background
            $scriptPath = base_path('laranode-scripts/bin/laranode-rebuild-assets.sh');
            if (file_exists($scriptPath)) {
                Process::start("sudo bash {$scriptPath}");
            }
        }

        session()->flash('success', 'Settings updated successfully.' . ($needsRebuild ? ' Assets are being rebuilt in the background.' : ''));

        return redirect()->route('settings.index');
    }

    /**
     * Get current settings from .env and config.
     */
    private function getCurrentSettings(): array
    {
        return [
            'app_name' => config('app.name'),
            'app_url' => config('app.url'),
            'app_timezone' => config('app.timezone'),
            'app_debug' => config('app.debug'),
            'reverb_host' => env('REVERB_HOST'),
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
        ];
    }

    /**
     * Update a value in the .env content.
     */
    private function updateEnvValue(string $envContent, string $key, string $value): string
    {
        // Handle values with spaces by wrapping in quotes
        if (preg_match('/\s/', $value) || str_contains($value, '#')) {
            $value = '"' . $value . '"';
        }

        $pattern = "/^{$key}=.*/m";

        if (preg_match($pattern, $envContent)) {
            // Key exists, update it
            return preg_replace($pattern, "{$key}={$value}", $envContent);
        } else {
            // Key doesn't exist, add it
            return $envContent . "\n{$key}={$value}";
        }
    }

    /**
     * Get list of available timezones.
     */
    public function getTimezones()
    {
        $timezones = timezone_identifiers_list();

        $grouped = [];
        foreach ($timezones as $timezone) {
            $parts = explode('/', $timezone, 2);
            $region = $parts[0];
            $city = $parts[1] ?? $timezone;

            if (!isset($grouped[$region])) {
                $grouped[$region] = [];
            }
            $grouped[$region][] = [
                'value' => $timezone,
                'label' => str_replace('_', ' ', $city),
            ];
        }

        return response()->json($grouped);
    }

    /**
     * Test the application URL.
     */
    public function testUrl(Request $request)
    {
        $url = $request->input('url');

        if (!$url) {
            return response()->json(['success' => false, 'message' => 'No URL provided']);
        }

        try {
            $response = @file_get_contents($url, false, stream_context_create([
                'http' => [
                    'timeout' => 5,
                    'ignore_errors' => true,
                ],
                'ssl' => [
                    'verify_peer' => false,
                    'verify_peer_name' => false,
                ],
            ]));

            if ($response !== false) {
                return response()->json(['success' => true, 'message' => 'URL is accessible']);
            }

            return response()->json(['success' => false, 'message' => 'URL is not accessible']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()]);
        }
    }
}
