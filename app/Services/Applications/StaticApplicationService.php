<?php

namespace App\Services\Applications;

use App\Enums\ApplicationType;
use App\Models\Website;
use Illuminate\Support\Facades\Process;

class StaticApplicationService extends AbstractApplicationService
{
    protected ApplicationType $type = ApplicationType::Static;

    public function create(Website $website): void
    {
        $this->createDocumentRoot($website);
        $this->createNginxStaticConfig($website);
    }

    public function delete(Website $website): void
    {
        $this->removeNginxConfig($website);
        $this->deleteWebsiteFiles($website);
    }

    public function update(Website $website, array $changes): void
    {
        if (isset($changes['document_root'])) {
            $this->updateNginxConfig($website);
        }
    }

    public function restart(Website $website): void
    {
        $this->reloadNginx();
    }

    public function getStatus(Website $website): array
    {
        $result = Process::run(['systemctl', 'is-active', 'nginx']);

        return [
            'running' => trim($result->output()) === 'active',
            'type' => 'static',
        ];
    }

    private function createNginxStaticConfig(Website $website): void
    {
        $templatePath = config('laranode.nginx_static_template');

        $result = Process::run([
            'sudo',
            $this->laranodeBinPath . '/laranode-add-nginx-static.sh',
            $website->user->systemUsername,
            $website->url,
            $website->fullDocumentRoot,
            $templatePath,
        ]);

        if ($result->failed()) {
            throw new ApplicationServiceException('Failed to create Nginx static config: ' . $result->errorOutput());
        }
    }

    private function removeNginxConfig(Website $website): void
    {
        $result = Process::run([
            'sudo',
            $this->laranodeBinPath . '/laranode-remove-nginx-site.sh',
            $website->url,
        ]);

        if ($result->failed()) {
            throw new ApplicationServiceException('Failed to remove Nginx config: ' . $result->errorOutput());
        }
    }

    private function updateNginxConfig(Website $website): void
    {
        $this->removeNginxConfig($website);
        $this->createNginxStaticConfig($website);
    }
}
