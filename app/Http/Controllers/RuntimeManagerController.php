<?php

namespace App\Http\Controllers;

use App\Enums\RuntimeType;
use App\Models\PhpVersion;
use App\Models\NodeVersion;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RuntimeManagerController extends Controller
{
    /**
     * Render the Runtime management page
     */
    public function index()
    {
        return inertia('Runtimes/Index', [
            'runtimeTypes' => RuntimeType::options(),
        ]);
    }

    /**
     * Get available versions for a runtime type (for websites form)
     */
    public function getVersions(Request $request): JsonResponse
    {
        $type = $request->input('type', 'php');

        if ($type === 'php') {
            $versions = PhpVersion::active()->get();
        } else {
            $versions = NodeVersion::active()->get();
        }

        return response()->json($versions);
    }

    // =====================
    // PHP Management
    // =====================

    /**
     * List all installed PHP versions with their systemctl status
     */
    public function listPhp(): JsonResponse
    {
        $scriptPath = base_path('laranode-scripts/bin/laranode-php-list.sh');
        $output = shell_exec("sudo bash {$scriptPath}");

        $phpVersions = json_decode($output, true) ?? [];

        return response()->json($phpVersions);
    }

    /**
     * Install a new PHP version
     */
    public function installPhp(Request $request): JsonResponse
    {
        $request->validate([
            'version' => 'required|string|regex:/^\d+\.\d+$/',
        ]);

        $version = $request->input('version');
        $scriptPath = base_path('laranode-scripts/bin/laranode-php-install.sh');

        $output = shell_exec("sudo bash {$scriptPath} {$version} 2>&1");

        if (strpos($output, 'installed successfully') !== false) {
            return response()->json([
                'success' => true,
                'message' => "PHP {$version} installed successfully",
                'output' => $output
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => "Failed to install PHP {$version}",
            'output' => $output
        ], 500);
    }

    /**
     * Uninstall a PHP version
     */
    public function uninstallPhp(Request $request): JsonResponse
    {
        $request->validate([
            'version' => 'required|string|regex:/^\d+\.\d+$/',
        ]);

        $version = $request->input('version');
        $scriptPath = base_path('laranode-scripts/bin/laranode-php-uninstall.sh');

        $output = shell_exec("sudo bash {$scriptPath} {$version} 2>&1");

        if (strpos($output, 'uninstalled successfully') !== false) {
            return response()->json([
                'success' => true,
                'message' => "PHP {$version} uninstalled successfully",
                'output' => $output
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => "Failed to uninstall PHP {$version}",
            'output' => $output
        ], 500);
    }

    /**
     * Toggle PHP-FPM service (enable/disable)
     */
    public function togglePhpService(Request $request): JsonResponse
    {
        $request->validate([
            'version' => 'required|string|regex:/^\d+\.\d+$/',
            'enabled' => 'required|boolean',
        ]);

        $version = $request->input('version');
        $enabled = $request->input('enabled');
        $action = $enabled ? 'enable' : 'disable';

        $scriptPath = base_path('laranode-scripts/bin/laranode-php-service.sh');

        $output = shell_exec("sudo bash {$scriptPath} {$action} {$version} 2>&1");

        if (strpos($output, 'completed successfully') !== false) {
            return response()->json([
                'success' => true,
                'message' => "PHP {$version}-FPM service {$action}d successfully",
                'output' => $output
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => "Failed to {$action} PHP {$version}-FPM service",
            'output' => $output
        ], 500);
    }

    /**
     * Restart PHP-FPM service
     */
    public function restartPhpService(Request $request): JsonResponse
    {
        $request->validate([
            'version' => 'required|string|regex:/^\d+\.\d+$/',
        ]);

        $version = $request->input('version');
        $scriptPath = base_path('laranode-scripts/bin/laranode-php-service.sh');

        $output = shell_exec("sudo bash {$scriptPath} restart {$version} 2>&1");

        if (strpos($output, 'completed successfully') !== false) {
            return response()->json([
                'success' => true,
                'message' => "PHP {$version}-FPM service restarted successfully",
                'output' => $output
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => "Failed to restart PHP {$version}-FPM service",
            'output' => $output
        ], 500);
    }

    // =====================
    // Node.js Management
    // =====================

    /**
     * List all installed Node.js versions
     */
    public function listNode(): JsonResponse
    {
        $scriptPath = base_path('laranode-scripts/bin/laranode-node-list.sh');

        if (!file_exists($scriptPath)) {
            return response()->json([]);
        }

        $output = shell_exec("sudo bash {$scriptPath}");
        $nodeVersions = json_decode($output, true) ?? [];

        return response()->json($nodeVersions);
    }

    /**
     * Install a new Node.js version
     */
    public function installNode(Request $request): JsonResponse
    {
        $request->validate([
            'version' => 'required|string|regex:/^\d+$/',
        ]);

        $version = $request->input('version');
        $scriptPath = base_path('laranode-scripts/bin/laranode-node-install.sh');

        $output = shell_exec("sudo bash {$scriptPath} {$version} 2>&1");

        if (strpos($output, 'installed successfully') !== false) {
            // Add to database
            NodeVersion::updateOrCreate(
                ['version' => $version],
                ['is_active' => true]
            );

            return response()->json([
                'success' => true,
                'message' => "Node.js {$version} installed successfully",
                'output' => $output
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => "Failed to install Node.js {$version}",
            'output' => $output
        ], 500);
    }

    /**
     * Uninstall a Node.js version
     */
    public function uninstallNode(Request $request): JsonResponse
    {
        $request->validate([
            'version' => 'required|string|regex:/^\d+$/',
        ]);

        $version = $request->input('version');
        $scriptPath = base_path('laranode-scripts/bin/laranode-node-uninstall.sh');

        $output = shell_exec("sudo bash {$scriptPath} {$version} 2>&1");

        if (strpos($output, 'uninstalled successfully') !== false) {
            // Remove from database
            NodeVersion::where('version', $version)->delete();

            return response()->json([
                'success' => true,
                'message' => "Node.js {$version} uninstalled successfully",
                'output' => $output
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => "Failed to uninstall Node.js {$version}",
            'output' => $output
        ], 500);
    }

    /**
     * Set default Node.js version
     */
    public function setDefaultNode(Request $request): JsonResponse
    {
        $request->validate([
            'version' => 'required|string|regex:/^\d+$/',
        ]);

        $version = $request->input('version');
        $scriptPath = base_path('laranode-scripts/bin/laranode-node-default.sh');

        $output = shell_exec("sudo bash {$scriptPath} {$version} 2>&1");

        if (strpos($output, 'set as default') !== false || strpos($output, 'completed successfully') !== false) {
            return response()->json([
                'success' => true,
                'message' => "Node.js {$version} set as default",
                'output' => $output
            ]);
        }

        return response()->json([
            'success' => false,
            'message' => "Failed to set Node.js {$version} as default",
            'output' => $output
        ], 500);
    }

    /**
     * List PM2 processes
     */
    public function listPm2(): JsonResponse
    {
        $output = shell_exec("pm2 jlist 2>/dev/null");
        $processes = json_decode($output, true) ?? [];

        return response()->json($processes);
    }

    /**
     * Restart all PM2 processes
     */
    public function restartPm2(): JsonResponse
    {
        $output = shell_exec("pm2 restart all 2>&1");

        return response()->json([
            'success' => true,
            'message' => 'PM2 processes restarted',
            'output' => $output
        ]);
    }
}
