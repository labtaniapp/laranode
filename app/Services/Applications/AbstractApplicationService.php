<?php

namespace App\Services\Applications;

use App\Contracts\ApplicationServiceInterface;
use App\Enums\ApplicationType;
use App\Models\Website;
use Illuminate\Support\Facades\Process;
use Exception;

abstract class AbstractApplicationService implements ApplicationServiceInterface
{
    protected string $laranodeBinPath;
    protected ApplicationType $type;

    public function __construct()
    {
        $this->laranodeBinPath = config('laranode.laranode_bin_path');
    }

    public function getType(): string
    {
        return $this->type->value;
    }

    /**
     * Create the document root directory.
     */
    protected function createDocumentRoot(Website $website): void
    {
        $result = Process::run([
            'sudo',
            $this->laranodeBinPath . '/laranode-create-directory.sh',
            $website->fullDocumentRoot,
            $website->user->username,
        ]);

        if ($result->failed()) {
            throw new ApplicationServiceException('Failed to create document root: ' . $result->errorOutput());
        }
    }

    /**
     * Delete website files.
     */
    protected function deleteWebsiteFiles(Website $website): void
    {
        $result = Process::run(['rm', '-rf', $website->websiteRoot]);

        if ($result->failed()) {
            throw new ApplicationServiceException('Failed to delete website files: ' . $result->errorOutput());
        }
    }

    /**
     * Reload Apache configuration.
     */
    protected function reloadApache(): void
    {
        Process::run(['sudo', 'systemctl', 'reload', 'apache2']);
    }

    /**
     * Reload Nginx configuration.
     */
    protected function reloadNginx(): void
    {
        Process::run(['sudo', 'systemctl', 'reload', 'nginx']);
    }
}

class ApplicationServiceException extends Exception {}
