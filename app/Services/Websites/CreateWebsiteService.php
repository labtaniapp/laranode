<?php

namespace App\Services\Websites;

use App\Enums\ApplicationType;
use App\Models\User;
use App\Models\Website;
use App\Services\Applications\ApplicationServiceFactory;
use Exception;

class CreateWebsiteException extends Exception {}

class CreateWebsiteService
{
    private Website $website;

    public function __construct(private array $validated, private User $user) {}

    public function handle(): Website
    {
        // Set default application type if not provided
        if (!isset($this->validated['application_type'])) {
            $this->validated['application_type'] = ApplicationType::PHP->value;
        }

        // Assign port for Node.js applications if not provided
        if ($this->validated['application_type'] === ApplicationType::NodeJS->value && empty($this->validated['app_port'])) {
            $this->validated['app_port'] = $this->getNextAvailablePort();
        }

        $this->website = $this->user->websites()->make($this->validated);

        // Use the application service factory to create the site
        $applicationService = ApplicationServiceFactory::make($this->validated['application_type']);
        $applicationService->create($this->website);

        // If all was successful, save website
        $this->website->save();

        return $this->website;
    }

    /**
     * Get the next available port for Node.js applications.
     * Ports are assigned starting from 3000, incrementing for each new app.
     */
    private function getNextAvailablePort(): int
    {
        $basePort = 3000;

        $maxPort = Website::where('application_type', ApplicationType::NodeJS->value)
            ->max('app_port');

        return $maxPort ? $maxPort + 1 : $basePort;
    }
}
