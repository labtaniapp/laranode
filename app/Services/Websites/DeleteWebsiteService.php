<?php

namespace App\Services\Websites;

use App\Models\User;
use App\Models\Website;
use App\Services\Applications\ApplicationServiceFactory;
use Exception;

class DeleteWebsiteException extends Exception {}

class DeleteWebsiteService
{
    public function __construct(private Website $website, private User $user) {}

    public function handle(): void
    {
        // Use the application service factory to delete the site configuration
        $applicationService = ApplicationServiceFactory::forWebsite($this->website);
        $applicationService->delete($this->website);

        // If all was successful, delete website from database
        $this->website->delete();
    }
}
