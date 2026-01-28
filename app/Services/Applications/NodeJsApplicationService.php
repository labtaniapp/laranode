<?php

namespace App\Services\Applications;

use App\Enums\ApplicationType;
use App\Models\Website;
use Illuminate\Support\Facades\Process;

class NodeJsApplicationService extends AbstractApplicationService
{
    protected ApplicationType $type = ApplicationType::NodeJS;

    public function create(Website $website): void
    {
        $this->createDocumentRoot($website);
        $this->createNginxReverseProxy($website);
        $this->createPm2Config($website);
        $this->startPm2Process($website);
    }

    public function delete(Website $website): void
    {
        $this->stopPm2Process($website);
        $this->removePm2Config($website);
        $this->removeNginxConfig($website);
        $this->deleteWebsiteFiles($website);
    }

    public function update(Website $website, array $changes): void
    {
        $needsRestart = false;

        if (isset($changes['startup_file']) || isset($changes['app_port']) || isset($changes['instances'])) {
            $this->updatePm2Config($website);
            $needsRestart = true;
        }

        if (isset($changes['app_port'])) {
            $this->updateNginxConfig($website);
            $this->reloadNginx();
        }

        if ($needsRestart) {
            $this->restart($website);
        }
    }

    public function restart(Website $website): void
    {
        $processName = $website->pm2ProcessName;
        Process::run(['sudo', '-u', $website->user->systemUsername, 'pm2', 'restart', $processName]);
    }

    public function getStatus(Website $website): array
    {
        $processName = $website->pm2ProcessName;
        $result = Process::run([
            'sudo', '-u', $website->user->systemUsername,
            'pm2', 'jlist'
        ]);

        $processes = json_decode($result->output(), true) ?? [];
        $process = collect($processes)->firstWhere('name', $processName);

        return [
            'running' => $process && ($process['pm2_env']['status'] ?? '') === 'online',
            'type' => 'pm2',
            'pid' => $process['pid'] ?? null,
            'memory' => $process['monit']['memory'] ?? 0,
            'cpu' => $process['monit']['cpu'] ?? 0,
            'uptime' => $process['pm2_env']['pm_uptime'] ?? null,
        ];
    }

    private function createNginxReverseProxy(Website $website): void
    {
        $templatePath = config('laranode.nginx_proxy_template');

        $result = Process::run([
            'sudo',
            $this->laranodeBinPath . '/laranode-add-nginx-proxy.sh',
            $website->user->systemUsername,
            $website->url,
            (string) $website->app_port,
            $templatePath,
        ]);

        if ($result->failed()) {
            throw new ApplicationServiceException('Failed to create Nginx proxy: ' . $result->errorOutput());
        }
    }

    private function createPm2Config(Website $website): void
    {
        $config = [
            'name' => $website->pm2ProcessName,
            'script' => $website->startup_file ?? 'app.js',
            'cwd' => $website->fullDocumentRoot,
            'instances' => $website->instances ?? 1,
            'exec_mode' => ($website->instances ?? 1) > 1 ? 'cluster' : 'fork',
            'env' => array_merge(
                ['PORT' => $website->app_port, 'NODE_ENV' => 'production'],
                $website->environment_variables ?? []
            ),
            'watch' => false,
            'max_memory_restart' => '500M',
            'error_file' => $website->websiteRoot . '/logs/pm2-error.log',
            'out_file' => $website->websiteRoot . '/logs/pm2-out.log',
        ];

        $configPath = $website->websiteRoot . '/ecosystem.config.js';
        $configContent = 'module.exports = { apps: [' . json_encode($config, JSON_PRETTY_PRINT) . '] };';

        // Create logs directory
        Process::run([
            'sudo', '-u', $website->user->systemUsername,
            'mkdir', '-p', $website->websiteRoot . '/logs'
        ]);

        // Write config file
        Process::run([
            'sudo', '-u', $website->user->systemUsername,
            'bash', '-c', "echo " . escapeshellarg($configContent) . " > " . escapeshellarg($configPath)
        ]);
    }

    private function startPm2Process(Website $website): void
    {
        $configPath = $website->websiteRoot . '/ecosystem.config.js';

        $result = Process::run([
            'sudo', '-u', $website->user->systemUsername,
            'pm2', 'start', $configPath
        ]);

        if ($result->failed()) {
            throw new ApplicationServiceException('Failed to start PM2 process: ' . $result->errorOutput());
        }

        // Save PM2 process list for startup
        Process::run([
            'sudo', '-u', $website->user->systemUsername,
            'pm2', 'save'
        ]);
    }

    private function stopPm2Process(Website $website): void
    {
        $processName = $website->pm2ProcessName;

        Process::run([
            'sudo', '-u', $website->user->systemUsername,
            'pm2', 'delete', $processName
        ]);

        Process::run([
            'sudo', '-u', $website->user->systemUsername,
            'pm2', 'save'
        ]);
    }

    private function removePm2Config(Website $website): void
    {
        $configPath = $website->websiteRoot . '/ecosystem.config.js';
        Process::run(['rm', '-f', $configPath]);
    }

    private function removeNginxConfig(Website $website): void
    {
        $result = Process::run([
            'sudo',
            $this->laranodeBinPath . '/laranode-remove-nginx-proxy.sh',
            $website->url,
        ]);

        if ($result->failed()) {
            throw new ApplicationServiceException('Failed to remove Nginx config: ' . $result->errorOutput());
        }
    }

    private function updatePm2Config(Website $website): void
    {
        $this->createPm2Config($website);
    }

    private function updateNginxConfig(Website $website): void
    {
        $this->removeNginxConfig($website);
        $this->createNginxReverseProxy($website);
    }
}
