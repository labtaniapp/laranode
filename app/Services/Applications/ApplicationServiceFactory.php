<?php

namespace App\Services\Applications;

use App\Contracts\ApplicationServiceInterface;
use App\Enums\ApplicationType;
use App\Models\Website;
use InvalidArgumentException;

class ApplicationServiceFactory
{
    /**
     * Create an application service for the given type.
     */
    public static function make(ApplicationType|string $type): ApplicationServiceInterface
    {
        if (is_string($type)) {
            $type = ApplicationType::from($type);
        }

        return match($type) {
            ApplicationType::PHP => new PhpApplicationService(),
            ApplicationType::NodeJS => new NodeJsApplicationService(),
            ApplicationType::Static => new StaticApplicationService(),
            default => throw new InvalidArgumentException("Unsupported application type: {$type->value}"),
        };
    }

    /**
     * Create an application service for the given website.
     */
    public static function forWebsite(Website $website): ApplicationServiceInterface
    {
        return self::make($website->application_type);
    }

    /**
     * Get all available application types.
     */
    public static function getAvailableTypes(): array
    {
        return ApplicationType::options();
    }
}
