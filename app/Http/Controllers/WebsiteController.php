<?php

namespace App\Http\Controllers;

use App\Enums\ApplicationType;
use App\Http\Requests\CreateWebsiteRequest;
use App\Http\Requests\UpdateWebsitePHPVersionRequest;
use App\Models\CronJob;
use App\Models\NodeVersion;
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

        return Inertia::render('Websites/Show', compact(
            'website',
            'cronJobs',
            'cronTemplates',
            'phpVersions',
            'nodeVersions'
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
            return redirect()->route('websites.index');

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

            return response()->json([
                'success' => true,
                'ssl_status' => $result['ssl_status'],
                'ssl_enabled' => $result['ssl_enabled'],
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
