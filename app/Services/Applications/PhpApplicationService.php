<?php

namespace App\Services\Applications;

use App\Enums\ApplicationType;
use App\Models\Website;
use App\Services\Laranode\AddVhostEntryService;
use App\Services\Laranode\CreatePhpFpmPoolService;
use Illuminate\Support\Facades\Process;

class PhpApplicationService extends AbstractApplicationService
{
    protected ApplicationType $type = ApplicationType::PHP;

    public function create(Website $website): void
    {
        $this->createDocumentRoot($website);
        (new CreatePhpFpmPoolService($website))->handle();
        (new AddVhostEntryService($website))->handle();
    }

    public function delete(Website $website): void
    {
        $this->disableApacheSite($website);
        $this->removeVhostFile($website);
        $this->syncPhpFpmPools($website);
        $this->deleteWebsiteFiles($website);
    }

    public function update(Website $website, array $changes): void
    {
        // Handle PHP version changes
        if (isset($changes['php_version_id'])) {
            $this->updatePhpVersion($website);
        }
    }

    public function restart(Website $website): void
    {
        $phpVersion = $website->phpVersion->version;
        Process::run(['sudo', 'systemctl', 'reload', "php{$phpVersion}-fpm"]);
        $this->reloadApache();
    }

    public function getStatus(Website $website): array
    {
        $phpVersion = $website->phpVersion->version;
        $result = Process::run(['systemctl', 'is-active', "php{$phpVersion}-fpm"]);

        return [
            'running' => trim($result->output()) === 'active',
            'type' => 'php-fpm',
            'version' => $phpVersion,
        ];
    }

    private function disableApacheSite(Website $website): void
    {
        $result = Process::run(['sudo', 'a2dissite', $website->url . '.conf']);

        if ($result->failed()) {
            throw new ApplicationServiceException('Failed to disable Apache site: ' . $result->errorOutput());
        }
    }

    private function removeVhostFile(Website $website): void
    {
        $result = Process::run(['sudo', 'rm', '-f', '/etc/apache2/sites-available/' . $website->url . '.conf']);

        if ($result->failed()) {
            throw new ApplicationServiceException('Failed to remove vhost file: ' . $result->errorOutput());
        }
    }

    private function syncPhpFpmPools(Website $website): void
    {
        $phpVersion = $website->phpVersion;

        // Check if user has other websites with the same PHP version
        $sitesUsingThisPhpVersion = $website->user
            ->websites()
            ->where('id', '!=', $website->id)
            ->where('php_version_id', $phpVersion->id)
            ->count();

        if ($sitesUsingThisPhpVersion > 0) {
            return;
        }

        // Remove the PHP-FPM pool if no other sites use this version
        $result = Process::run([
            'sudo',
            $this->laranodeBinPath . '/laranode-remove-php-fpm-pool-for-user.sh',
            $website->user->systemUsername,
            $phpVersion->version,
        ]);

        if ($result->failed()) {
            throw new ApplicationServiceException('Failed to remove PHP-FPM pool: ' . $result->errorOutput());
        }
    }

    private function updatePhpVersion(Website $website): void
    {
        $result = Process::run([
            'sudo',
            $this->laranodeBinPath . '/laranode-update-php-version.sh',
            $website->user->systemUsername,
            $website->url,
            $website->phpVersion->version,
        ]);

        if ($result->failed()) {
            throw new ApplicationServiceException('Failed to update PHP version: ' . $result->errorOutput());
        }
    }
}
