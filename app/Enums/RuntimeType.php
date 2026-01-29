<?php

namespace App\Enums;

enum RuntimeType: string
{
    case PHP = 'php';
    case NodeJS = 'nodejs';
    // Future runtimes can be added here:
    // case Python = 'python';
    // case Ruby = 'ruby';
    // case Go = 'go';

    public function label(): string
    {
        return match($this) {
            self::PHP => 'PHP',
            self::NodeJS => 'Node.js',
        };
    }

    public function description(): string
    {
        return match($this) {
            self::PHP => 'PHP-FPM for running PHP applications',
            self::NodeJS => 'Node.js runtime with PM2 process manager',
        };
    }

    public function icon(): string
    {
        return match($this) {
            self::PHP => 'php',
            self::NodeJS => 'nodejs',
        };
    }

    public function serviceManager(): string
    {
        return match($this) {
            self::PHP => 'systemctl',
            self::NodeJS => 'nvm',
        };
    }

    public function processManager(): string
    {
        return match($this) {
            self::PHP => 'php-fpm',
            self::NodeJS => 'pm2',
        };
    }

    public function availableVersions(): array
    {
        return match($this) {
            self::PHP => ['8.4', '8.3', '8.2', '8.1', '8.0', '7.4'],
            self::NodeJS => ['22', '21', '20', '18', '16'],
        };
    }

    public static function options(): array
    {
        return array_map(fn($case) => [
            'value' => $case->value,
            'label' => $case->label(),
            'description' => $case->description(),
            'icon' => $case->icon(),
            'available_versions' => $case->availableVersions(),
        ], self::cases());
    }
}
