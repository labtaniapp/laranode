<?php

namespace App\Http\Controllers;

use App\Models\Deployment;
use App\Models\GitRepository;
use App\Models\Website;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Str;
use Inertia\Inertia;

class GitDeploymentController extends Controller
{
    /**
     * Display the git deployment page.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $websites = Website::mine()
            ->with(['gitRepository.latestDeployment'])
            ->orderBy('url')
            ->get()
            ->map(function ($website) {
                return [
                    'id' => $website->id,
                    'url' => $website->url,
                    'application_type' => $website->application_type,
                    'git_repository' => $website->gitRepository ? [
                        'id' => $website->gitRepository->id,
                        'provider' => $website->gitRepository->provider,
                        'repository_url' => $website->gitRepository->repository_url,
                        'repository_name' => $website->gitRepository->repository_name,
                        'branch' => $website->gitRepository->branch,
                        'framework' => $website->gitRepository->framework,
                        'auto_deploy' => $website->gitRepository->auto_deploy,
                        'last_deployed_at' => $website->gitRepository->last_deployed_at,
                        'webhook_url' => $website->gitRepository->webhook_url,
                        'latest_deployment' => $website->gitRepository->latestDeployment ? [
                            'id' => $website->gitRepository->latestDeployment->id,
                            'status' => $website->gitRepository->latestDeployment->status,
                            'status_label' => $website->gitRepository->latestDeployment->status_label,
                            'commit_hash' => $website->gitRepository->latestDeployment->short_commit_hash,
                            'commit_message' => $website->gitRepository->latestDeployment->commit_message,
                            'trigger' => $website->gitRepository->latestDeployment->trigger,
                            'duration' => $website->gitRepository->latestDeployment->formatted_duration,
                            'created_at' => $website->gitRepository->latestDeployment->created_at,
                        ] : null,
                    ] : null,
                ];
            });

        return Inertia::render('GitDeployment/Index', [
            'websites' => $websites,
            'frameworks' => [
                'laravel' => 'Laravel',
                'nodejs' => 'Node.js',
                'nuxt' => 'Nuxt.js',
                'nextjs' => 'Next.js',
                'static' => 'Static Site',
                'custom' => 'Custom',
            ],
        ]);
    }

    /**
     * Connect a git repository to a website.
     */
    public function connect(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'website_id' => 'required|exists:websites,id',
            'provider' => 'required|in:github,gitlab,bitbucket,custom',
            'repository_url' => 'required|string|max:500',
            'branch' => 'required|string|max:100',
            'framework' => 'required|in:laravel,nodejs,nuxt,nextjs,static,custom',
            'deploy_key' => 'nullable|string',
            'auto_deploy' => 'boolean',
            'zero_downtime' => 'boolean',
            'deploy_script' => 'nullable|string',
        ]);

        $website = Website::findOrFail($validated['website_id']);
        Gate::authorize('update', $website);

        // Check if already connected
        if ($website->gitRepository) {
            return back()->withErrors(['website_id' => 'This website already has a git repository connected.']);
        }

        // Get default deploy script if not provided
        $deployScript = $validated['deploy_script'] ?? GitRepository::getDefaultDeployScript($validated['framework']);

        $repository = GitRepository::create([
            'website_id' => $website->id,
            'user_id' => $user->id,
            'provider' => $validated['provider'],
            'repository_url' => $validated['repository_url'],
            'branch' => $validated['branch'],
            'framework' => $validated['framework'],
            'deploy_key' => $validated['deploy_key'] ?? null,
            'auto_deploy' => $validated['auto_deploy'] ?? false,
            'zero_downtime' => $validated['zero_downtime'] ?? true,
            'deploy_script' => $deployScript,
            'webhook_secret' => Str::random(40),
        ]);

        session()->flash('success', 'Git repository connected successfully.');

        return redirect()->route('git.index');
    }

    /**
     * Update repository settings.
     */
    public function update(Request $request, GitRepository $repository)
    {
        Gate::authorize('update', $repository->website);

        $validated = $request->validate([
            'branch' => 'required|string|max:100',
            'framework' => 'required|in:laravel,nodejs,nuxt,nextjs,static,custom',
            'auto_deploy' => 'boolean',
            'zero_downtime' => 'boolean',
            'keep_releases' => 'integer|min:1|max:20',
            'deploy_script' => 'nullable|string',
            'deploy_key' => 'nullable|string',
        ]);

        $repository->update([
            'branch' => $validated['branch'],
            'framework' => $validated['framework'],
            'auto_deploy' => $validated['auto_deploy'] ?? false,
            'zero_downtime' => $validated['zero_downtime'] ?? true,
            'keep_releases' => $validated['keep_releases'] ?? 5,
            'deploy_script' => $validated['deploy_script'],
        ]);

        // Only update deploy key if provided
        if (!empty($validated['deploy_key'])) {
            $repository->deploy_key = $validated['deploy_key'];
            $repository->save();
        }

        session()->flash('success', 'Repository settings updated.');

        return redirect()->route('git.index');
    }

    /**
     * Disconnect repository.
     */
    public function disconnect(GitRepository $repository)
    {
        Gate::authorize('delete', $repository->website);

        $repository->delete();

        session()->flash('success', 'Git repository disconnected.');

        return redirect()->route('git.index');
    }

    /**
     * Trigger a deployment.
     */
    public function deploy(Request $request, GitRepository $repository)
    {
        Gate::authorize('update', $repository->website);

        // Check if deployment already in progress
        $inProgress = $repository->deployments()
            ->whereIn('status', ['pending', 'cloning', 'building', 'deploying'])
            ->exists();

        if ($inProgress) {
            return back()->withErrors(['error' => 'A deployment is already in progress.']);
        }

        // Create deployment record
        $deployment = Deployment::create([
            'git_repository_id' => $repository->id,
            'user_id' => $request->user()->id,
            'branch' => $repository->branch,
            'status' => 'pending',
            'trigger' => 'manual',
        ]);

        // Run deploy script in background
        $this->runDeployment($deployment);

        session()->flash('success', 'Deployment started.');

        return redirect()->route('git.index');
    }

    /**
     * Rollback to a previous deployment.
     */
    public function rollback(Request $request, Deployment $deployment)
    {
        $repository = $deployment->gitRepository;
        Gate::authorize('update', $repository->website);

        if (!$deployment->canRollbackTo()) {
            return back()->withErrors(['error' => 'Cannot rollback to this deployment.']);
        }

        // Create rollback deployment record
        $rollbackDeployment = Deployment::create([
            'git_repository_id' => $repository->id,
            'user_id' => $request->user()->id,
            'branch' => $deployment->branch,
            'commit_hash' => $deployment->commit_hash,
            'commit_message' => 'Rollback to ' . $deployment->short_commit_hash,
            'status' => 'pending',
            'trigger' => 'rollback',
        ]);

        // Run rollback script
        $this->runRollback($rollbackDeployment, $deployment);

        session()->flash('success', 'Rollback started.');

        return redirect()->route('git.index');
    }

    /**
     * Get deployment history.
     */
    public function history(GitRepository $repository)
    {
        Gate::authorize('view', $repository->website);

        $deployments = $repository->deployments()
            ->orderBy('created_at', 'desc')
            ->take(20)
            ->get()
            ->map(function ($deployment) {
                return [
                    'id' => $deployment->id,
                    'commit_hash' => $deployment->short_commit_hash,
                    'commit_message' => $deployment->commit_message,
                    'commit_author' => $deployment->commit_author,
                    'branch' => $deployment->branch,
                    'status' => $deployment->status,
                    'status_label' => $deployment->status_label,
                    'status_color' => $deployment->status_color,
                    'trigger' => $deployment->trigger,
                    'duration' => $deployment->formatted_duration,
                    'error_message' => $deployment->error_message,
                    'can_rollback' => $deployment->canRollbackTo(),
                    'created_at' => $deployment->created_at,
                    'completed_at' => $deployment->completed_at,
                ];
            });

        return response()->json($deployments);
    }

    /**
     * Get deployment logs.
     */
    public function logs(Deployment $deployment)
    {
        Gate::authorize('view', $deployment->gitRepository->website);

        return response()->json([
            'id' => $deployment->id,
            'status' => $deployment->status,
            'log' => $deployment->log,
            'error_message' => $deployment->error_message,
        ]);
    }

    /**
     * Webhook endpoint for auto-deploy.
     */
    public function webhook(Request $request, GitRepository $repository, string $secret)
    {
        // Verify webhook secret
        if ($repository->webhook_secret !== $secret) {
            abort(403, 'Invalid webhook secret');
        }

        // Check if auto-deploy is enabled
        if (!$repository->auto_deploy) {
            return response()->json(['message' => 'Auto-deploy is disabled'], 200);
        }

        // Parse webhook payload based on provider
        $branch = $this->parseBranchFromWebhook($request, $repository->provider);

        // Only deploy if push is to the configured branch
        if ($branch !== $repository->branch) {
            return response()->json(['message' => 'Push to different branch, skipping'], 200);
        }

        // Check if deployment already in progress
        $inProgress = $repository->deployments()
            ->whereIn('status', ['pending', 'cloning', 'building', 'deploying'])
            ->exists();

        if ($inProgress) {
            return response()->json(['message' => 'Deployment already in progress'], 200);
        }

        // Get commit info from webhook
        $commitInfo = $this->parseCommitFromWebhook($request, $repository->provider);

        // Create deployment
        $deployment = Deployment::create([
            'git_repository_id' => $repository->id,
            'user_id' => $repository->user_id,
            'branch' => $branch,
            'commit_hash' => $commitInfo['hash'] ?? null,
            'commit_message' => $commitInfo['message'] ?? null,
            'commit_author' => $commitInfo['author'] ?? null,
            'status' => 'pending',
            'trigger' => 'webhook',
        ]);

        // Run deploy
        $this->runDeployment($deployment);

        return response()->json(['message' => 'Deployment triggered', 'deployment_id' => $deployment->id]);
    }

    /**
     * Regenerate webhook secret.
     */
    public function regenerateWebhook(GitRepository $repository)
    {
        Gate::authorize('update', $repository->website);

        $repository->generateWebhookSecret();

        session()->flash('success', 'Webhook secret regenerated.');

        return redirect()->route('git.index');
    }

    /**
     * Get default deploy script for framework.
     */
    public function getDeployScript(Request $request)
    {
        $framework = $request->get('framework', 'custom');
        $script = GitRepository::getDefaultDeployScript($framework);

        return response()->json(['script' => $script]);
    }

    /**
     * Run deployment process.
     */
    protected function runDeployment(Deployment $deployment): void
    {
        $scriptPath = base_path('laranode-scripts/bin/laranode-git-deploy.sh');
        $repository = $deployment->gitRepository;
        $website = $repository->website;

        $params = [
            $deployment->id,
            $repository->id,
            $website->id,
            $repository->user->username,
            $repository->repository_url,
            $repository->branch,
            $repository->framework,
            $repository->zero_downtime ? '1' : '0',
            $repository->keep_releases,
            base64_encode($repository->deploy_script ?? ''),
            base64_encode($repository->deploy_key_decrypted ?? ''),
        ];

        $paramsString = implode(' ', array_map('escapeshellarg', $params));

        Process::start("sudo bash {$scriptPath} {$paramsString} > /dev/null 2>&1 &");
    }

    /**
     * Run rollback process.
     */
    protected function runRollback(Deployment $rollbackDeployment, Deployment $targetDeployment): void
    {
        $scriptPath = base_path('laranode-scripts/bin/laranode-git-rollback.sh');
        $repository = $rollbackDeployment->gitRepository;

        $params = [
            $rollbackDeployment->id,
            $repository->id,
            $repository->user->username,
            $targetDeployment->release_path,
        ];

        $paramsString = implode(' ', array_map('escapeshellarg', $params));

        Process::start("sudo bash {$scriptPath} {$paramsString} > /dev/null 2>&1 &");
    }

    /**
     * Parse branch from webhook payload.
     */
    protected function parseBranchFromWebhook(Request $request, string $provider): ?string
    {
        $payload = $request->all();

        return match($provider) {
            'github' => isset($payload['ref']) ? str_replace('refs/heads/', '', $payload['ref']) : null,
            'gitlab' => $payload['ref'] ?? null,
            'bitbucket' => $payload['push']['changes'][0]['new']['name'] ?? null,
            default => $payload['ref'] ?? null,
        };
    }

    /**
     * Parse commit info from webhook payload.
     */
    protected function parseCommitFromWebhook(Request $request, string $provider): array
    {
        $payload = $request->all();

        return match($provider) {
            'github' => [
                'hash' => $payload['head_commit']['id'] ?? null,
                'message' => $payload['head_commit']['message'] ?? null,
                'author' => $payload['head_commit']['author']['name'] ?? null,
            ],
            'gitlab' => [
                'hash' => $payload['checkout_sha'] ?? null,
                'message' => $payload['commits'][0]['message'] ?? null,
                'author' => $payload['commits'][0]['author']['name'] ?? null,
            ],
            'bitbucket' => [
                'hash' => $payload['push']['changes'][0]['new']['target']['hash'] ?? null,
                'message' => $payload['push']['changes'][0]['new']['target']['message'] ?? null,
                'author' => $payload['push']['changes'][0]['new']['target']['author']['raw'] ?? null,
            ],
            default => [
                'hash' => null,
                'message' => null,
                'author' => null,
            ],
        };
    }
}
