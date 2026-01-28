<?php

namespace App\Contracts;

use App\Models\Website;
use App\Models\User;

interface ApplicationServiceInterface
{
    /**
     * Create the application configuration (vhost, process manager, etc.).
     */
    public function create(Website $website): void;

    /**
     * Delete the application configuration.
     */
    public function delete(Website $website): void;

    /**
     * Update the application configuration.
     */
    public function update(Website $website, array $changes): void;

    /**
     * Restart the application (reload config, restart process).
     */
    public function restart(Website $website): void;

    /**
     * Get the application status.
     */
    public function getStatus(Website $website): array;

    /**
     * Get the application type identifier.
     */
    public function getType(): string;
}
