<?php

namespace App\Http\Controllers;

use App\Models\SupervisorWorker;
use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Process;

class SupervisorController extends Controller
{
    /**
     * Get workers for a website.
     */
    public function index(Website $website)
    {
        Gate::authorize('view', $website);

        $workers = $website->supervisorWorkers()
            ->orderBy('name')
            ->get()
            ->map(function ($worker) {
                // Sync status from supervisor
                $this->syncWorkerStatus($worker);

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
                    'stdout_logfile' => $worker->stdout_log_path,
                    'stderr_logfile' => $worker->stderr_log_path,
                ];
            });

        return response()->json($workers);
    }

    /**
     * Get available presets for workers.
     */
    public function presets()
    {
        return response()->json(SupervisorWorker::PRESETS);
    }

    /**
     * Create a new worker.
     */
    public function store(Request $request, Website $website)
    {
        Gate::authorize('update', $website);

        $validated = $request->validate([
            'name' => 'required|string|max:50|regex:/^[a-z0-9\-]+$/',
            'command' => 'required|string|max:500',
            'numprocs' => 'integer|min:1|max:10',
            'autostart' => 'boolean',
            'autorestart' => 'boolean',
            'startsecs' => 'integer|min:0|max:60',
            'stopwaitsecs' => 'integer|min:5|max:300',
        ]);

        // Check for duplicate name
        $exists = $website->supervisorWorkers()
            ->where('name', $validated['name'])
            ->exists();

        if ($exists) {
            return back()->withErrors(['name' => 'A worker with this name already exists.']);
        }

        // Get user from website
        $user = $website->user;

        // Create worker record
        $worker = SupervisorWorker::create([
            'website_id' => $website->id,
            'name' => $validated['name'],
            'command' => $validated['command'],
            'directory' => $website->basePath,
            'user' => $user->username,
            'numprocs' => $validated['numprocs'] ?? 1,
            'autostart' => $validated['autostart'] ?? true,
            'autorestart' => $validated['autorestart'] ?? true,
            'startsecs' => $validated['startsecs'] ?? 1,
            'stopwaitsecs' => $validated['stopwaitsecs'] ?? 10,
            'stdout_logfile' => $website->basePath . '/logs/worker-' . $validated['name'] . '.log',
            'stderr_logfile' => $website->basePath . '/logs/worker-' . $validated['name'] . '-error.log',
            'status' => 'stopped',
        ]);

        // Create supervisor config
        $this->createSupervisorConfig($worker);

        session()->flash('success', 'Worker created successfully.');

        return back();
    }

    /**
     * Update a worker.
     */
    public function update(Request $request, SupervisorWorker $worker)
    {
        Gate::authorize('update', $worker->website);

        $validated = $request->validate([
            'command' => 'required|string|max:500',
            'numprocs' => 'integer|min:1|max:10',
            'autostart' => 'boolean',
            'autorestart' => 'boolean',
            'startsecs' => 'integer|min:0|max:60',
            'stopwaitsecs' => 'integer|min:5|max:300',
        ]);

        // Stop the worker first
        $this->controlWorker($worker, 'stop');

        $worker->update([
            'command' => $validated['command'],
            'numprocs' => $validated['numprocs'] ?? 1,
            'autostart' => $validated['autostart'] ?? true,
            'autorestart' => $validated['autorestart'] ?? true,
            'startsecs' => $validated['startsecs'] ?? 1,
            'stopwaitsecs' => $validated['stopwaitsecs'] ?? 10,
        ]);

        // Recreate supervisor config
        $this->createSupervisorConfig($worker);

        // Restart if autostart
        if ($worker->autostart) {
            $this->controlWorker($worker, 'start');
        }

        session()->flash('success', 'Worker updated successfully.');

        return back();
    }

    /**
     * Delete a worker.
     */
    public function destroy(SupervisorWorker $worker)
    {
        Gate::authorize('delete', $worker->website);

        // Delete supervisor config
        $this->deleteSupervisorConfig($worker);

        $worker->delete();

        session()->flash('success', 'Worker deleted successfully.');

        return back();
    }

    /**
     * Start a worker.
     */
    public function start(SupervisorWorker $worker)
    {
        Gate::authorize('update', $worker->website);

        $this->controlWorker($worker, 'start');

        $worker->update([
            'status' => 'starting',
            'last_started_at' => now(),
        ]);

        // Sync status after brief delay
        sleep(1);
        $this->syncWorkerStatus($worker);

        session()->flash('success', 'Worker started.');

        return back();
    }

    /**
     * Stop a worker.
     */
    public function stop(SupervisorWorker $worker)
    {
        Gate::authorize('update', $worker->website);

        $this->controlWorker($worker, 'stop');

        $worker->update([
            'status' => 'stopping',
            'last_stopped_at' => now(),
        ]);

        // Sync status after brief delay
        sleep(1);
        $this->syncWorkerStatus($worker);

        session()->flash('success', 'Worker stopped.');

        return back();
    }

    /**
     * Restart a worker.
     */
    public function restart(SupervisorWorker $worker)
    {
        Gate::authorize('update', $worker->website);

        $this->controlWorker($worker, 'restart');

        $worker->update([
            'status' => 'starting',
            'last_started_at' => now(),
        ]);

        // Sync status after brief delay
        sleep(1);
        $this->syncWorkerStatus($worker);

        session()->flash('success', 'Worker restarted.');

        return back();
    }

    /**
     * Get worker logs.
     */
    public function logs(SupervisorWorker $worker, Request $request)
    {
        Gate::authorize('view', $worker->website);

        $type = $request->get('type', 'stdout');
        $lines = $request->get('lines', 100);

        $logFile = $type === 'stderr'
            ? $worker->stderr_log_path
            : $worker->stdout_log_path;

        $scriptPath = base_path('laranode-scripts/bin/laranode-supervisor-logs.sh');

        $result = Process::run("sudo bash {$scriptPath} " . escapeshellarg($logFile) . " " . intval($lines));

        return response()->json([
            'logs' => $result->successful() ? $result->output() : 'Unable to read logs',
            'type' => $type,
        ]);
    }

    /**
     * Get all workers stats for dashboard.
     */
    public function stats()
    {
        $scriptPath = base_path('laranode-scripts/bin/laranode-supervisor-status.sh');
        $result = Process::run("sudo bash {$scriptPath}");

        $output = $result->output();
        $workers = [];

        if ($result->successful() && !empty($output)) {
            foreach (explode("\n", trim($output)) as $line) {
                if (preg_match('/^(laranode-\d+-[\w-]+)(?::\d+)?\s+(\w+)/', $line, $matches)) {
                    $programName = $matches[1];
                    $status = strtolower($matches[2]);

                    // Parse website ID from program name
                    if (preg_match('/^laranode-(\d+)-(.+)$/', $programName, $parts)) {
                        $workers[] = [
                            'program_name' => $programName,
                            'website_id' => (int) $parts[1],
                            'name' => $parts[2],
                            'status' => $status,
                        ];
                    }
                }
            }
        }

        $stats = [
            'total' => count($workers),
            'running' => count(array_filter($workers, fn($w) => $w['status'] === 'running')),
            'stopped' => count(array_filter($workers, fn($w) => $w['status'] === 'stopped')),
            'fatal' => count(array_filter($workers, fn($w) => $w['status'] === 'fatal')),
            'workers' => $workers,
        ];

        return response()->json($stats);
    }

    /**
     * Create supervisor config file.
     */
    protected function createSupervisorConfig(SupervisorWorker $worker): void
    {
        $scriptPath = base_path('laranode-scripts/bin/laranode-supervisor-create.sh');

        $params = [
            $worker->program_name,
            $worker->command,
            $worker->directory ?? $worker->website->basePath,
            $worker->user,
            $worker->numprocs,
            $worker->autostart ? 'true' : 'false',
            $worker->autorestart ? 'true' : 'false',
            $worker->startsecs,
            $worker->stopwaitsecs,
            $worker->stdout_log_path,
            $worker->stderr_log_path,
        ];

        $paramsString = implode(' ', array_map('escapeshellarg', $params));

        Process::run("sudo bash {$scriptPath} {$paramsString}");
    }

    /**
     * Delete supervisor config file.
     */
    protected function deleteSupervisorConfig(SupervisorWorker $worker): void
    {
        $scriptPath = base_path('laranode-scripts/bin/laranode-supervisor-delete.sh');

        Process::run("sudo bash {$scriptPath} " . escapeshellarg($worker->program_name));
    }

    /**
     * Control a worker (start/stop/restart).
     */
    protected function controlWorker(SupervisorWorker $worker, string $action): void
    {
        $scriptPath = base_path('laranode-scripts/bin/laranode-supervisor-control.sh');

        Process::run("sudo bash {$scriptPath} " . escapeshellarg($action) . " " . escapeshellarg($worker->program_name));
    }

    /**
     * Sync worker status from supervisor.
     */
    protected function syncWorkerStatus(SupervisorWorker $worker): void
    {
        $scriptPath = base_path('laranode-scripts/bin/laranode-supervisor-status.sh');
        $result = Process::run("sudo bash {$scriptPath} " . escapeshellarg($worker->program_name));

        if ($result->successful()) {
            $output = $result->output();

            if (preg_match('/\s(RUNNING|STOPPED|STARTING|STOPPING|FATAL|BACKOFF|EXITED|UNKNOWN)/i', $output, $matches)) {
                $status = strtolower($matches[1]);

                // Map supervisor statuses to our statuses
                $statusMap = [
                    'running' => 'running',
                    'stopped' => 'stopped',
                    'starting' => 'starting',
                    'stopping' => 'stopping',
                    'fatal' => 'fatal',
                    'backoff' => 'fatal',
                    'exited' => 'stopped',
                    'unknown' => 'unknown',
                ];

                $worker->status = $statusMap[$status] ?? 'unknown';
                $worker->save();
            }
        }
    }
}
