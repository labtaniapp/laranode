<?php

namespace App\Http\Controllers;

use App\Enums\ApplicationType;
use App\Http\Requests\CreateWebsiteRequest;
use App\Http\Requests\UpdateWebsitePHPVersionRequest;
use App\Models\Backup;
use App\Models\BackupSettings;
use App\Models\CronJob;
use App\Models\GitRepository;
use App\Models\NodeVersion;
use App\Models\SupervisorWorker;
use App\Models\Website;
use App\Models\PhpVersion;
use App\Services\Websites\CreateWebsiteService;
use App\Services\Websites\DeleteWebsiteService;
use App\Services\Websites\UpdateWebsitePHPVersionService;
use App\Actions\SSL\GenerateWebsiteSslAction;
use App\Actions\SSL\RemoveWebsiteSslAction;
use App\Actions\SSL\CheckWebsiteSslStatusAction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class WebsiteController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): \Inertia\Response
    {
        $websites = Website::mine()
            ->with(['user', 'phpVersion', 'nodeVersion', 'databases'])
            ->orderBy('url')
            ->get();

        try {
            $serverIp = Http::get('https://api.ipify.org')->body();
        } catch (\Exception $exception) {
            $serverIp = 'N/A';
        }

        // Get available application types and versions
        $applicationTypes = ApplicationType::options();
        $nodeVersions = NodeVersion::active()->get();

        return Inertia::render('Websites/Index', compact(
            'websites',
            'serverIp',
            'applicationTypes',
            'nodeVersions'
        ));
    }

    /**
     * Display the specified website with tabs (Overview, Cron Jobs, etc.)
     */
    public function show(Website $website): \Inertia\Response
    {
        Gate::authorize('view', $website);

        $website->load(['user', 'phpVersion', 'nodeVersion', 'databases']);

        $cronJobs = CronJob::forWebsite($website->id)
            ->orderBy('created_at', 'desc')
            ->get();

        $cronTemplates = CronJob::templates();

        // Get available versions for settings
        $phpVersions = PhpVersion::active()->get();
        $nodeVersions = NodeVersion::active()->get();

        // Get Git repository for this website
        $gitRepository = GitRepository::where('website_id', $website->id)
            ->with('latestDeployment')
            ->first();

        if ($gitRepository) {
            $gitRepository = [
                'id' => $gitRepository->id,
                'provider' => $gitRepository->provider,
                'repository_url' => $gitRepository->repository_url,
                'repository_name' => $gitRepository->repository_name,
                'branch' => $gitRepository->branch,
                'framework' => $gitRepository->framework,
                'auto_deploy' => $gitRepository->auto_deploy,
                'last_deployed_at' => $gitRepository->last_deployed_at,
                'webhook_url' => $gitRepository->webhook_url,
                'latest_deployment' => $gitRepository->latestDeployment ? [
                    'id' => $gitRepository->latestDeployment->id,
                    'status' => $gitRepository->latestDeployment->status,
                    'status_label' => $gitRepository->latestDeployment->status_label,
                    'commit_hash' => $gitRepository->latestDeployment->short_commit_hash,
                    'commit_message' => $gitRepository->latestDeployment->commit_message,
                    'trigger' => $gitRepository->latestDeployment->trigger,
                    'duration' => $gitRepository->latestDeployment->formatted_duration,
                    'created_at' => $gitRepository->latestDeployment->created_at,
                ] : null,
            ];
        }

        // Get backups for this website
        $backups = Backup::where('website_id', $website->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($backup) {
                return [
                    'id' => $backup->id,
                    'name' => $backup->name,
                    'filename' => $backup->filename,
                    'storage' => $backup->storage,
                    'size' => $backup->formatted_size,
                    'includes_files' => $backup->includes_files,
                    'includes_database' => $backup->includes_database,
                    'status' => $backup->status,
                    'error_message' => $backup->error_message,
                    'created_at' => $backup->created_at,
                    'is_downloadable' => $backup->isDownloadable(),
                    'is_restorable' => $backup->isRestorable(),
                ];
            });

        // Get backup settings
        $backupSettings = BackupSettings::forUser(auth()->user());
        $backupSettings = [
            'storage' => $backupSettings->storage,
            's3_configured' => $backupSettings->isS3Configured(),
        ];

        // Get supervisor workers for this website
        $workers = SupervisorWorker::where('website_id', $website->id)
            ->orderBy('name')
            ->get()
            ->map(function ($worker) {
                return [
                    'id' => $worker->id,
                    'name' => $worker->name,
                    'command' => $worker->command,
                    'numprocs' => $worker->numprocs,
                    'autostart' => $worker->autostart,
                    'autorestart' => $worker->autorestart,
                    'status' => $worker->status,
                    'status_color' => $worker->status_color,
                    'last_started_at' => $worker->last_started_at,
                    'last_stopped_at' => $worker->last_stopped_at,
                ];
            });

        return Inertia::render('Websites/Show', compact(
            'website',
            'cronJobs',
            'cronTemplates',
            'phpVersions',
            'nodeVersions',
            'gitRepository',
            'backups',
            'backupSettings',
            'workers'
        ));
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(CreateWebsiteRequest $request)
    {
        $user = $request->user();

        (new CreateWebsiteService($request->validated(), $user))->handle();

        session()->flash('success', 'Website created successfully.');

        return redirect()->route('websites.index');
    }


    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateWebsitePHPVersionRequest $request, string $id)
    {
        $website = Website::findOrFail($id);

        Gate::authorize('update', $website);

        $validated = $request->validated();

        (new UpdateWebsitePHPVersionService($website, (int) $validated['php_version_id']))->handle();

        session()->flash('success', 'Website updated successfully.');

        return redirect()->route('websites.index');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Website $website)
    {
        Gate::authorize('delete', $website);

        $user = $request->user();

        (new DeleteWebsiteService($website, $user))->handle();

        session()->flash('success', 'Website deleted successfully.');

        return redirect()->route('websites.index');
    }

    /**
     * Update website settings (document root, PHP/Node version, app port, etc.)
     */
    public function updateSettings(Request $request, Website $website)
    {
        Gate::authorize('update', $website);

        $rules = [
            'document_root' => 'sometimes|string|max:255',
        ];

        // Add validation rules based on application type
        if ($website->isPhp()) {
            $rules['php_version_id'] = 'sometimes|integer|exists:php_versions,id';
        } elseif ($website->isNodeJs()) {
            $rules['node_version_id'] = 'sometimes|integer|exists:node_versions,id';
            $rules['app_port'] = 'sometimes|integer|min:1024|max:65535';
            $rules['startup_file'] = 'sometimes|string|max:255';
        }

        $validated = $request->validate($rules);

        // Update PHP version if changed
        if (isset($validated['php_version_id']) && $website->php_version_id !== (int) $validated['php_version_id']) {
            (new UpdateWebsitePHPVersionService($website, (int) $validated['php_version_id']))->handle();
            unset($validated['php_version_id']);
        }

        // Update other settings
        if (!empty($validated)) {
            $website->update($validated);
        }

        session()->flash('success', 'Website settings updated successfully.');

        return redirect()->route('websites.show', $website);
    }

    /**
     * Toggle SSL certificate for a website
     */
    public function toggleSsl(Request $request, Website $website)
    {
        Gate::authorize('update', $website);

        $request->validate([
            'enabled' => 'required|boolean'
        ]);

        try {
            if ($request->enabled) {
                // Generate SSL certificate
                (new GenerateWebsiteSslAction())->execute($website, $request->user()->email);
            } else {
                // Remove SSL certificate
                (new RemoveWebsiteSslAction())->execute($website);
            }

            session()->flash('success', $request->enabled ? 'SSL certificate generated successfully' : 'SSL certificate removed successfully');
            return redirect()->route('websites.show', $website);

        } catch (\Exception $e) {
            session()->flash('error', 'Failed to ' . ($request->enabled ? 'generate' : 'remove') . ' SSL certificate: ' . $e->getMessage());
            return redirect()->back();
        }
    }

    /**
     * Check SSL status for a website
     */
    public function checkSslStatus(Website $website)
    {
        Gate::authorize('view', $website);

        try {
            $result = (new CheckWebsiteSslStatusAction())->execute($website);

            // Refresh the website model to get latest data
            $website->refresh();

            return response()->json([
                'success' => true,
                'ssl_status' => $result['ssl_status'],
                'ssl_enabled' => $result['ssl_enabled'],
                'ssl_expires_at' => $website->ssl_expires_at?->toISOString(),
                'ssl_generated_at' => $website->ssl_generated_at?->toISOString(),
                'status_text' => $website->getSslStatusText()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to check SSL status: ' . $e->getMessage()
            ], 500);
        }
    }

    // =====================
    // Cron Job Management
    // =====================

    /**
     * Get cron jobs for a website
     */
    public function getCronJobs(Website $website)
    {
        Gate::authorize('view', $website);

        $cronJobs = CronJob::forWebsite($website->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($cronJobs);
    }

    /**
     * Store a new cron job for a website
     */
    public function storeCronJob(Request $request, Website $website)
    {
        Gate::authorize('update', $website);

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'minute' => 'required|string|max:20',
            'hour' => 'required|string|max:20',
            'day' => 'required|string|max:20',
            'month' => 'required|string|max:20',
            'weekday' => 'required|string|max:20',
            'command' => 'required|string|max:1000',
        ]);

        $cronJob = CronJob::create([
            'website_id' => $website->id,
            'user_id' => $request->user()->id,
            'name' => $validated['name'],
            'minute' => $validated['minute'],
            'hour' => $validated['hour'],
            'day' => $validated['day'],
            'month' => $validated['month'],
            'weekday' => $validated['weekday'],
            'command' => $validated['command'],
            'is_active' => true,
        ]);

        // Sync crontab for user
        $this->syncUserCrontab($request->user());

        session()->flash('success', 'Cron job created successfully.');

        return redirect()->route('websites.show', $website);
    }

    /**
     * Update an existing cron job
     */
    public function updateCronJob(Request $request, Website $website, CronJob $cronJob)
    {
        Gate::authorize('update', $website);

        // Ensure cron job belongs to website
        if ($cronJob->website_id !== $website->id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'minute' => 'required|string|max:20',
            'hour' => 'required|string|max:20',
            'day' => 'required|string|max:20',
            'month' => 'required|string|max:20',
            'weekday' => 'required|string|max:20',
            'command' => 'required|string|max:1000',
        ]);

        $cronJob->update($validated);

        // Sync crontab for user
        $this->syncUserCrontab($request->user());

        session()->flash('success', 'Cron job updated successfully.');

        return redirect()->route('websites.show', $website);
    }

    /**
     * Delete a cron job
     */
    public function destroyCronJob(Request $request, Website $website, CronJob $cronJob)
    {
        Gate::authorize('update', $website);

        // Ensure cron job belongs to website
        if ($cronJob->website_id !== $website->id) {
            abort(404);
        }

        $cronJob->delete();

        // Sync crontab for user
        $this->syncUserCrontab($request->user());

        session()->flash('success', 'Cron job deleted successfully.');

        return redirect()->route('websites.show', $website);
    }

    /**
     * Toggle cron job active status
     */
    public function toggleCronJob(Request $request, Website $website, CronJob $cronJob)
    {
        Gate::authorize('update', $website);

        // Ensure cron job belongs to website
        if ($cronJob->website_id !== $website->id) {
            abort(404);
        }

        $cronJob->update([
            'is_active' => !$cronJob->is_active,
        ]);

        // Sync crontab for user
        $this->syncUserCrontab($request->user());

        return response()->json([
            'success' => true,
            'is_active' => $cronJob->is_active,
            'message' => $cronJob->is_active ? 'Cron job activated' : 'Cron job deactivated',
        ]);
    }

    // =====================
    // Logs Management
    // =====================

    /**
     * Get available log files for a website
     */
    public function getLogFiles(Website $website)
    {
        Gate::authorize('view', $website);

        $user = $website->user;
        $logs = [];

        // Common logs for all application types
        $commonLogs = [
            'nginx-access' => "/home/{$user->username}/logs/nginx-access.log",
            'nginx-error' => "/home/{$user->username}/logs/nginx-error.log",
        ];

        // PHP-specific logs
        if ($website->isPhp()) {
            $logs = array_merge($commonLogs, [
                'apache-access' => "/home/{$user->username}/logs/apache-access.log",
                'apache-error' => "/home/{$user->username}/logs/apache-error.log",
                'php-fpm-error' => "/home/{$user->username}/logs/php-fpm-error.log",
            ]);
        }
        // Node.js-specific logs
        elseif ($website->isNodeJs()) {
            $logs = array_merge($commonLogs, [
                'pm2-out' => "{$website->websiteRoot}/logs/pm2-out.log",
                'pm2-error' => "{$website->websiteRoot}/logs/pm2-error.log",
            ]);
        }
        // Static sites
        else {
            $logs = $commonLogs;
        }

        // Check which files exist and get their info
        $availableLogs = [];
        foreach ($logs as $name => $path) {
            if (file_exists($path)) {
                $availableLogs[] = [
                    'name' => $name,
                    'path' => $path,
                    'size' => $this->formatLogFileSize(filesize($path)),
                    'modified' => date('Y-m-d H:i:s', filemtime($path)),
                ];
            }
        }

        return response()->json([
            'application_type' => $website->application_type,
            'logs' => $availableLogs,
        ]);
    }

    /**
     * Get log content for a website
     */
    public function getLogContent(Request $request, Website $website)
    {
        Gate::authorize('view', $website);

        $validated = $request->validate([
            'log_name' => 'required|string',
            'lines' => 'integer|min:10|max:1000',
        ]);

        $logName = $validated['log_name'];
        $lines = $validated['lines'] ?? 100;

        $user = $website->user;

        // Define allowed log paths based on application type
        $allowedLogs = [
            'nginx-access' => "/home/{$user->username}/logs/nginx-access.log",
            'nginx-error' => "/home/{$user->username}/logs/nginx-error.log",
        ];

        if ($website->isPhp()) {
            $allowedLogs = array_merge($allowedLogs, [
                'apache-access' => "/home/{$user->username}/logs/apache-access.log",
                'apache-error' => "/home/{$user->username}/logs/apache-error.log",
                'php-fpm-error' => "/home/{$user->username}/logs/php-fpm-error.log",
            ]);
        } elseif ($website->isNodeJs()) {
            $allowedLogs = array_merge($allowedLogs, [
                'pm2-out' => "{$website->websiteRoot}/logs/pm2-out.log",
                'pm2-error' => "{$website->websiteRoot}/logs/pm2-error.log",
            ]);
        }

        if (!isset($allowedLogs[$logName])) {
            return response()->json(['error' => 'Invalid log file'], 400);
        }

        $logPath = $allowedLogs[$logName];

        if (!file_exists($logPath)) {
            return response()->json([
                'content' => '',
                'message' => 'Log file does not exist yet',
            ]);
        }

        // Read last N lines using tail command
        $content = shell_exec("tail -n {$lines} " . escapeshellarg($logPath) . " 2>/dev/null");

        return response()->json([
            'content' => $content ?? '',
            'log_name' => $logName,
            'lines' => $lines,
        ]);
    }

    /**
     * Clear a log file for a website
     */
    public function clearLog(Request $request, Website $website)
    {
        Gate::authorize('update', $website);

        $validated = $request->validate([
            'log_name' => 'required|string',
        ]);

        $logName = $validated['log_name'];
        $user = $website->user;

        // Define allowed log paths
        $allowedLogs = [
            'nginx-access' => "/home/{$user->username}/logs/nginx-access.log",
            'nginx-error' => "/home/{$user->username}/logs/nginx-error.log",
        ];

        if ($website->isPhp()) {
            $allowedLogs = array_merge($allowedLogs, [
                'apache-access' => "/home/{$user->username}/logs/apache-access.log",
                'apache-error' => "/home/{$user->username}/logs/apache-error.log",
                'php-fpm-error' => "/home/{$user->username}/logs/php-fpm-error.log",
            ]);
        } elseif ($website->isNodeJs()) {
            $allowedLogs = array_merge($allowedLogs, [
                'pm2-out' => "{$website->websiteRoot}/logs/pm2-out.log",
                'pm2-error' => "{$website->websiteRoot}/logs/pm2-error.log",
            ]);
        }

        if (!isset($allowedLogs[$logName])) {
            return response()->json(['error' => 'Invalid log file'], 400);
        }

        $logPath = $allowedLogs[$logName];

        if (file_exists($logPath)) {
            file_put_contents($logPath, '');
        }

        return response()->json([
            'success' => true,
            'message' => 'Log file cleared successfully',
        ]);
    }

    /**
     * Format file size for display
     */
    private function formatLogFileSize(int $bytes): string
    {
        if ($bytes >= 1073741824) {
            return round($bytes / 1073741824, 2) . ' GB';
        } elseif ($bytes >= 1048576) {
            return round($bytes / 1048576, 2) . ' MB';
        } elseif ($bytes >= 1024) {
            return round($bytes / 1024, 2) . ' KB';
        }
        return $bytes . ' B';
    }

    /**
     * Sync all active cron jobs to user's crontab
     */
    private function syncUserCrontab($user): void
    {
        // Get all active cron jobs for this user
        $cronJobs = CronJob::where('user_id', $user->id)
            ->active()
            ->get();

        // Build crontab content
        $crontabLines = ["# LaraNode Cron Jobs - User: {$user->username}", "# DO NOT EDIT MANUALLY"];

        foreach ($cronJobs as $job) {
            $crontabLines[] = "# Website: {$job->website->url}" . ($job->name ? " - {$job->name}" : "");
            $crontabLines[] = $job->toCrontabLine();
        }

        $crontabContent = implode("\n", $crontabLines) . "\n";

        // Write to user's crontab
        $scriptPath = base_path('laranode-scripts/bin/laranode-sync-crontab.sh');

        if (file_exists($scriptPath)) {
            $tempFile = tempnam(sys_get_temp_dir(), 'crontab_');
            file_put_contents($tempFile, $crontabContent);

            shell_exec("sudo bash {$scriptPath} {$user->username} {$tempFile} 2>&1");

            unlink($tempFile);
        }
    }
}
