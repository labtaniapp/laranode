<?php

namespace App\Services\Database;

use App\Contracts\DatabaseServiceInterface;
use App\Enums\DatabaseDriver;
use InvalidArgumentException;

class DatabaseServiceFactory
{
    /**
     * Create a database service for the given driver.
     */
    public static function make(DatabaseDriver|string $driver): DatabaseServiceInterface
    {
        if (is_string($driver)) {
            $driver = DatabaseDriver::from($driver);
        }

        return match($driver) {
            DatabaseDriver::MySQL => new MySQLDatabaseService(),
            DatabaseDriver::PostgreSQL => new PostgreSQLDatabaseService(),
            default => throw new InvalidArgumentException("Unsupported database driver: {$driver->value}"),
        };
    }

    /**
     * Get all available database services.
     */
    public static function getAvailableDrivers(): array
    {
        $drivers = [];

        foreach (DatabaseDriver::cases() as $driver) {
            $service = self::make($driver);
            $drivers[] = [
                'driver' => $driver->value,
                'label' => $driver->label(),
                'port' => $driver->defaultPort(),
                'charset' => $driver->defaultCharset(),
                'collation' => $driver->defaultCollation(),
                'available' => $service->testConnection(),
            ];
        }

        return $drivers;
    }
}
