<?php

namespace App\Http\Controllers;

use App\Models\Backup;
use App\Models\BackupSettings;
use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class BackupController extends Controller
{
    /**
     * Display the backups page.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $backups = Backup::mine()
            ->with('website')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($backup) {
                return [
                    'id' => $backup->id,
                    'name' => $backup->name,
                    'website' => $backup->website ? [
                        'id' => $backup->website->id,
                        'url' => $backup->website->url,
                    ] : null,
                    'filename' => $backup->filename,
                    'storage' => $backup->storage,
                    'size' => $backup->formatted_size,
                    'size_bytes' => $backup->size,
                    'includes_files' => $backup->includes_files,
                    'includes_database' => $backup->includes_database,
                    'status' => $backup->status,
                    'error_message' => $backup->error_message,
                    'created_at' => $backup->created_at,
                    'completed_at' => $backup->completed_at,
                    'is_downloadable' => $backup->isDownloadable(),
                    'is_restorable' => $backup->isRestorable(),
                ];
            });

        $websites = Website::mine()
            ->orderBy('url')
            ->get(['id', 'url', 'application_type']);

        $settings = BackupSettings::forUser($user);

        return Inertia::render('Backups/Index', [
            'backups' => $backups,
            'websites' => $websites,
            'settings' => [
                'auto_backup_enabled' => $settings->auto_backup_enabled,
                'frequency' => $settings->frequency,
                'retention_days' => $settings->retention_days,
                'storage' => $settings->storage,
                's3_bucket' => $settings->s3_bucket,
                's3_region' => $settings->s3_region,
                's3_endpoint' => $settings->s3_endpoint,
                's3_access_key' => $settings->s3_access_key,
                's3_path' => $settings->s3_path,
                's3_configured' => $settings->isS3Configured(),
            ],
        ]);
    }

    /**
     * Create a new backup.
     */
    public function store(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'website_id' => 'required|integer|exists:websites,id',
            'includes_files' => 'boolean',
            'includes_database' => 'boolean',
            'storage' => 'in:local,s3',
        ]);

        $website = Website::findOrFail($validated['website_id']);
        Gate::authorize('view', $website);

        $settings = BackupSettings::forUser($user);

        // Check S3 configuration if using S3
        $storage = $validated['storage'] ?? 'local';
        if ($storage === 's3' && !$settings->isS3Configured()) {
            return back()->withErrors(['storage' => 'S3 storage is not configured. Please configure it in settings first.']);
        }

        // Create backup record
        $timestamp = now()->format('Y-m-d_H-i-s');
        $filename = "{$website->url}_{$timestamp}.tar.gz";

        $backup = Backup::create([
            'website_id' => $website->id,
            'user_id' => $user->id,
            'name' => "Backup {$website->url} - {$timestamp}",
            'filename' => $filename,
            'path' => "/home/{$user->username}/backups",
            'storage' => $storage,
            'includes_files' => $validated['includes_files'] ?? true,
            'includes_database' => $validated['includes_database'] ?? true,
            'status' => 'pending',
        ]);

        // Run backup script in background
        $scriptPath = base_path('laranode-scripts/bin/laranode-backup-create.sh');

        $params = [
            $backup->id,
            $website->id,
            $user->username,
            $validated['includes_files'] ?? true ? '1' : '0',
            $validated['includes_database'] ?? true ? '1' : '0',
            $storage,
        ];

        if ($storage === 's3') {
            $params[] = $settings->s3_bucket;
            $params[] = $settings->s3_region;
            $params[] = $settings->s3_access_key;
            $params[] = $settings->s3_secret_key_decrypted;
            $params[] = $settings->s3_path ?? '';
            $params[] = $settings->s3_endpoint ?? '';
        }

        $paramsString = implode(' ', array_map('escapeshellarg', $params));

        Process::start("sudo bash {$scriptPath} {$paramsString} > /dev/null 2>&1 &");

        session()->flash('success', 'Backup started. This may take a few minutes.');

        return redirect()->route('backups.index');
    }

    /**
     * Download a backup.
     */
    public function download(Backup $backup)
    {
        Gate::authorize('view', $backup->website);

        if (!$backup->isDownloadable()) {
            abort(404, 'Backup not available for download');
        }

        $fullPath = $backup->full_path;

        if (!file_exists($fullPath)) {
            abort(404, 'Backup file not found');
        }

        return response()->download($fullPath, $backup->filename);
    }

    /**
     * Restore a backup.
     */
    public function restore(Request $request, Backup $backup)
    {
        $user = $request->user();

        Gate::authorize('update', $backup->website);

        if (!$backup->isRestorable()) {
            return back()->withErrors(['error' => 'This backup cannot be restored.']);
        }

        $validated = $request->validate([
            'restore_files' => 'boolean',
            'restore_database' => 'boolean',
        ]);

        // Run restore script in background
        $scriptPath = base_path('laranode-scripts/bin/laranode-backup-restore.sh');

        $params = [
            $backup->id,
            $backup->website_id,
            $user->username,
            $validated['restore_files'] ?? true ? '1' : '0',
            $validated['restore_database'] ?? true ? '1' : '0',
        ];

        $paramsString = implode(' ', array_map('escapeshellarg', $params));

        Process::start("sudo bash {$scriptPath} {$paramsString} > /dev/null 2>&1 &");

        session()->flash('success', 'Restore started. This may take a few minutes.');

        return redirect()->route('backups.index');
    }

    /**
     * Delete a backup.
     */
    public function destroy(Backup $backup)
    {
        Gate::authorize('delete', $backup->website);

        // Delete the file if it exists locally
        if ($backup->storage === 'local' && file_exists($backup->full_path)) {
            unlink($backup->full_path);
        }

        // If S3, delete from S3
        if ($backup->storage === 's3') {
            $settings = BackupSettings::forUser($backup->user);
            if ($settings->isS3Configured()) {
                try {
                    $s3Path = ($settings->s3_path ? $settings->s3_path . '/' : '') . $backup->filename;

                    // Configure S3 disk dynamically
                    $s3Config = [
                        'driver' => 's3',
                        'key' => $settings->s3_access_key,
                        'secret' => $settings->s3_secret_key_decrypted,
                        'region' => $settings->s3_region,
                        'bucket' => $settings->s3_bucket,
                    ];

                    if ($settings->s3_endpoint) {
                        $s3Config['endpoint'] = $settings->s3_endpoint;
                        $s3Config['use_path_style_endpoint'] = true;
                    }

                    config(['filesystems.disks.s3_backup' => $s3Config]);

                    Storage::disk('s3_backup')->delete($s3Path);
                } catch (\Exception $e) {
                    // Log error but continue with deletion
                }
            }
        }

        $backup->delete();

        session()->flash('success', 'Backup deleted successfully.');

        return redirect()->route('backups.index');
    }

    /**
     * Update backup settings.
     */
    public function updateSettings(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'auto_backup_enabled' => 'boolean',
            'frequency' => 'in:daily,weekly,monthly',
            'retention_days' => 'integer|min:1|max:365',
            'storage' => 'in:local,s3',
            's3_bucket' => 'nullable|string|max:255',
            's3_region' => 'nullable|string|max:50',
            's3_endpoint' => 'nullable|string|max:255',
            's3_access_key' => 'nullable|string|max:255',
            's3_secret_key' => 'nullable|string|max:255',
            's3_path' => 'nullable|string|max:255',
        ]);

        $settings = BackupSettings::forUser($user);

        $settings->update([
            'auto_backup_enabled' => $validated['auto_backup_enabled'] ?? false,
            'frequency' => $validated['frequency'] ?? 'daily',
            'retention_days' => $validated['retention_days'] ?? 7,
            'storage' => $validated['storage'] ?? 'local',
            's3_bucket' => $validated['s3_bucket'],
            's3_region' => $validated['s3_region'],
            's3_endpoint' => $validated['s3_endpoint'],
            's3_access_key' => $validated['s3_access_key'],
            's3_path' => $validated['s3_path'],
        ]);

        // Only update secret key if provided
        if (!empty($validated['s3_secret_key'])) {
            $settings->s3_secret_key = $validated['s3_secret_key'];
            $settings->save();
        }

        session()->flash('success', 'Backup settings updated successfully.');

        return redirect()->route('backups.index');
    }

    /**
     * Test S3 connection.
     */
    public function testS3(Request $request)
    {
        $validated = $request->validate([
            's3_bucket' => 'required|string',
            's3_region' => 'required|string',
            's3_endpoint' => 'nullable|string',
            's3_access_key' => 'required|string',
            's3_secret_key' => 'required|string',
        ]);

        try {
            // Configure S3 disk dynamically
            $s3Config = [
                'driver' => 's3',
                'key' => $validated['s3_access_key'],
                'secret' => $validated['s3_secret_key'],
                'region' => $validated['s3_region'],
                'bucket' => $validated['s3_bucket'],
            ];

            if (!empty($validated['s3_endpoint'])) {
                $s3Config['endpoint'] = $validated['s3_endpoint'];
                $s3Config['use_path_style_endpoint'] = true;
            }

            config(['filesystems.disks.s3_test' => $s3Config]);

            // Try to list files to test connection
            Storage::disk('s3_test')->files('/');

            return response()->json([
                'success' => true,
                'message' => 'Successfully connected to S3 bucket.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to connect: ' . $e->getMessage(),
            ], 400);
        }
    }

    /**
     * Get backup status (for polling).
     */
    public function status(Backup $backup)
    {
        Gate::authorize('view', $backup->website);

        return response()->json([
            'id' => $backup->id,
            'status' => $backup->status,
            'size' => $backup->formatted_size,
            'error_message' => $backup->error_message,
            'completed_at' => $backup->completed_at,
        ]);
    }
}
