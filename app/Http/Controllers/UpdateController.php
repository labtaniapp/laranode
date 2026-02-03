<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class UpdateController extends Controller
{
    protected string $panelPath;
    protected string $branch;

    public function __construct()
    {
        $this->panelPath = base_path();
        $this->branch = config('laranode.branch', 'main');
    }

    /**
     * Get current version and update status.
     */
    public function status()
    {
        $currentVersion = config('laranode.version', '1.0.0');
        $lastCheck = Cache::get('laranode_update_last_check');
        $updateAvailable = Cache::get('laranode_update_available', false);
        $latestVersion = Cache::get('laranode_latest_version', $currentVersion);
        $changelog = Cache::get('laranode_changelog', []);

        return response()->json([
            'current_version' => $currentVersion,
            'latest_version' => $latestVersion,
            'update_available' => $updateAvailable,
            'last_check' => $lastCheck,
            'changelog' => $changelog,
            'branch' => $this->branch,
        ]);
    }

    /**
     * Check for updates from the repository.
     */
    public function checkForUpdates()
    {
        try {
            // Fetch latest from remote
            $result = Process::path($this->panelPath)
                ->timeout(60)
                ->run("git fetch origin {$this->branch}");

            if (!$result->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to fetch updates: ' . $result->errorOutput(),
                ], 500);
            }

            // Get current commit
            $currentCommit = trim(Process::path($this->panelPath)
                ->run('git rev-parse HEAD')
                ->output());

            // Get latest remote commit
            $latestCommit = trim(Process::path($this->panelPath)
                ->run("git rev-parse origin/{$this->branch}")
                ->output());

            // Check if update is available
            $updateAvailable = $currentCommit !== $latestCommit;

            // Get commit count behind
            $behindCount = 0;
            $changelog = [];

            if ($updateAvailable) {
                $behindResult = Process::path($this->panelPath)
                    ->run("git rev-list HEAD..origin/{$this->branch} --count");
                $behindCount = (int) trim($behindResult->output());

                // Get changelog (commit messages)
                $logResult = Process::path($this->panelPath)
                    ->run("git log HEAD..origin/{$this->branch} --oneline --no-decorate -n 20");

                if ($logResult->successful()) {
                    $lines = array_filter(explode("\n", trim($logResult->output())));
                    foreach ($lines as $line) {
                        $parts = explode(' ', $line, 2);
                        if (count($parts) === 2) {
                            $changelog[] = [
                                'hash' => $parts[0],
                                'message' => $parts[1],
                            ];
                        }
                    }
                }
            }

            // Get latest version from remote config
            $latestVersion = $this->getRemoteVersion();

            // Cache the results
            Cache::put('laranode_update_last_check', now()->toIso8601String(), 3600);
            Cache::put('laranode_update_available', $updateAvailable, 3600);
            Cache::put('laranode_latest_version', $latestVersion, 3600);
            Cache::put('laranode_changelog', $changelog, 3600);
            Cache::put('laranode_commits_behind', $behindCount, 3600);

            return response()->json([
                'success' => true,
                'update_available' => $updateAvailable,
                'current_version' => config('laranode.version'),
                'latest_version' => $latestVersion,
                'commits_behind' => $behindCount,
                'changelog' => $changelog,
                'last_check' => now()->toIso8601String(),
            ]);
        } catch (\Exception $e) {
            Log::error('Update check failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Failed to check for updates: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get version from remote config file.
     */
    protected function getRemoteVersion(): string
    {
        $result = Process::path($this->panelPath)
            ->run("git show origin/{$this->branch}:config/laranode.php 2>/dev/null | grep \"'version'\" | head -1");

        if ($result->successful()) {
            preg_match("/'version'\s*=>\s*'([^']+)'/", $result->output(), $matches);
            if (!empty($matches[1])) {
                return $matches[1];
            }
        }

        return config('laranode.version', '1.0.0');
    }

    /**
     * Perform the update.
     */
    public function performUpdate(Request $request)
    {
        try {
            // Create backup if enabled
            if (config('laranode.update.backup_before_update', true)) {
                $this->createBackup();
            }

            // Enable maintenance mode
            Process::path($this->panelPath)->run('php artisan down --refresh=15');

            // Pull latest changes
            $pullResult = Process::path($this->panelPath)
                ->timeout(300)
                ->run("git pull origin {$this->branch}");

            if (!$pullResult->successful()) {
                // Disable maintenance mode on failure
                Process::path($this->panelPath)->run('php artisan up');

                return response()->json([
                    'success' => false,
                    'message' => 'Git pull failed: ' . $pullResult->errorOutput(),
                    'stage' => 'git_pull',
                ], 500);
            }

            // Run composer install
            $composerResult = Process::path($this->panelPath)
                ->timeout(600)
                ->env(['COMPOSER_ALLOW_SUPERUSER' => '1'])
                ->run('composer install --no-dev --optimize-autoloader');

            if (!$composerResult->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Composer install failed: ' . $composerResult->errorOutput(),
                    'stage' => 'composer',
                ], 500);
            }

            // Run migrations
            $migrateResult = Process::path($this->panelPath)
                ->timeout(120)
                ->run('php artisan migrate --force');

            if (!$migrateResult->successful()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Migration failed: ' . $migrateResult->errorOutput(),
                    'stage' => 'migrate',
                ], 500);
            }

            // Build frontend assets
            $npmResult = Process::path($this->panelPath)
                ->timeout(600)
                ->run('npm install && npm run build');

            if (!$npmResult->successful()) {
                Log::warning('NPM build had issues: ' . $npmResult->errorOutput());
                // Continue anyway, assets might still work
            }

            // Clear and rebuild caches
            Process::path($this->panelPath)->run('php artisan config:cache');
            Process::path($this->panelPath)->run('php artisan route:cache');
            Process::path($this->panelPath)->run('php artisan view:cache');
            Process::path($this->panelPath)->run('php artisan event:cache');

            // Restart queue workers if running
            Process::path($this->panelPath)->run('php artisan queue:restart');

            // Disable maintenance mode
            Process::path($this->panelPath)->run('php artisan up');

            // Clear update cache
            Cache::forget('laranode_update_available');
            Cache::forget('laranode_latest_version');
            Cache::forget('laranode_changelog');
            Cache::forget('laranode_commits_behind');

            // Log the update
            Log::info('Laranode updated successfully to version ' . config('laranode.version'));

            return response()->json([
                'success' => true,
                'message' => 'Update completed successfully',
                'new_version' => config('laranode.version'),
            ]);
        } catch (\Exception $e) {
            // Try to disable maintenance mode
            Process::path($this->panelPath)->run('php artisan up');

            Log::error('Update failed: ' . $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Update failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Create a backup before updating.
     */
    protected function createBackup(): void
    {
        $backupDir = storage_path('backups/updates');
        File::ensureDirectoryExists($backupDir);

        $timestamp = now()->format('Y-m-d_H-i-s');
        $backupFile = "{$backupDir}/pre-update-{$timestamp}.tar.gz";

        // Backup important files
        $filesToBackup = [
            '.env',
            'config/laranode.php',
            'database/database.sqlite',
        ];

        $existingFiles = array_filter($filesToBackup, function ($file) {
            return File::exists(base_path($file));
        });

        if (!empty($existingFiles)) {
            $fileList = implode(' ', $existingFiles);
            Process::path($this->panelPath)
                ->run("tar -czf {$backupFile} {$fileList}");
        }

        // Keep only last 5 backups
        $backups = File::glob("{$backupDir}/pre-update-*.tar.gz");
        rsort($backups);
        foreach (array_slice($backups, 5) as $oldBackup) {
            File::delete($oldBackup);
        }
    }

    /**
     * Get update logs.
     */
    public function getLogs()
    {
        $logFile = storage_path('logs/laravel.log');
        $logs = [];

        if (File::exists($logFile)) {
            $content = File::get($logFile);
            preg_match_all('/\[.*?\] local\.(INFO|WARNING|ERROR): (Laranode|Update).*/', $content, $matches, PREG_SET_ORDER);

            foreach (array_slice($matches, -20) as $match) {
                $logs[] = $match[0];
            }
        }

        return response()->json(['logs' => $logs]);
    }

    /**
     * Rollback to previous version (if backup exists).
     */
    public function rollback()
    {
        $backupDir = storage_path('backups/updates');
        $backups = File::glob("{$backupDir}/pre-update-*.tar.gz");

        if (empty($backups)) {
            return response()->json([
                'success' => false,
                'message' => 'No backup available for rollback',
            ], 404);
        }

        rsort($backups);
        $latestBackup = $backups[0];

        try {
            Process::path($this->panelPath)->run('php artisan down');

            // Git reset to previous commit
            Process::path($this->panelPath)->run('git reset --hard HEAD~1');

            // Restore backup
            Process::path($this->panelPath)->run("tar -xzf {$latestBackup}");

            // Run composer and migrations
            Process::path($this->panelPath)
                ->env(['COMPOSER_ALLOW_SUPERUSER' => '1'])
                ->run('composer install --no-dev --optimize-autoloader');

            Process::path($this->panelPath)->run('php artisan migrate --force');
            Process::path($this->panelPath)->run('npm install && npm run build');

            // Clear caches
            Process::path($this->panelPath)->run('php artisan config:cache');
            Process::path($this->panelPath)->run('php artisan route:cache');

            Process::path($this->panelPath)->run('php artisan up');

            Log::info('Laranode rolled back successfully');

            return response()->json([
                'success' => true,
                'message' => 'Rollback completed successfully',
            ]);
        } catch (\Exception $e) {
            Process::path($this->panelPath)->run('php artisan up');

            return response()->json([
                'success' => false,
                'message' => 'Rollback failed: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get system information for updates.
     */
    public function systemInfo()
    {
        $gitVersion = trim(Process::run('git --version')->output());
        $composerVersion = trim(Process::run('composer --version 2>/dev/null | head -1')->output());
        $nodeVersion = trim(Process::run('node --version 2>/dev/null')->output());
        $npmVersion = trim(Process::run('npm --version 2>/dev/null')->output());
        $phpVersion = phpversion();

        // Check disk space
        $diskFree = disk_free_space($this->panelPath);
        $diskTotal = disk_total_space($this->panelPath);

        // Get current branch and commit
        $currentBranch = trim(Process::path($this->panelPath)->run('git branch --show-current')->output());
        $currentCommit = trim(Process::path($this->panelPath)->run('git rev-parse --short HEAD')->output());
        $lastCommitDate = trim(Process::path($this->panelPath)->run('git log -1 --format=%ci')->output());

        return response()->json([
            'php_version' => $phpVersion,
            'git_version' => $gitVersion,
            'composer_version' => $composerVersion,
            'node_version' => $nodeVersion,
            'npm_version' => $npmVersion,
            'current_branch' => $currentBranch,
            'current_commit' => $currentCommit,
            'last_commit_date' => $lastCommitDate,
            'disk_free' => $this->formatBytes($diskFree),
            'disk_total' => $this->formatBytes($diskTotal),
            'disk_free_bytes' => $diskFree,
            'update_safe' => $diskFree > 500000000, // At least 500MB free
        ]);
    }

    protected function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB', 'TB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }
        return round($bytes, 2) . ' ' . $units[$i];
    }
}
