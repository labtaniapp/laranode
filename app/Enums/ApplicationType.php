<?php

namespace App\Enums;

enum ApplicationType: string
{
    case PHP = 'php';
    case NodeJS = 'nodejs';
    case Static = 'static';
    // Future types can be added here:
    // case Python = 'python';
    // case Go = 'go';
    // case Ruby = 'ruby';

    public function label(): string
    {
        return match($this) {
            self::PHP => 'PHP',
            self::NodeJS => 'Node.js',
            self::Static => 'Static (HTML/CSS/JS)',
        };
    }

    public function description(): string
    {
        return match($this) {
            self::PHP => 'PHP application with PHP-FPM (Laravel, WordPress, etc.)',
            self::NodeJS => 'Node.js application with PM2 process manager',
            self::Static => 'Static files served directly (HTML, CSS, JavaScript)',
        };
    }

    public function icon(): string
    {
        return match($this) {
            self::PHP => 'php',
            self::NodeJS => 'nodejs',
            self::Static => 'html',
        };
    }

    public function requiresVersion(): bool
    {
        return match($this) {
            self::PHP => true,
            self::NodeJS => true,
            self::Static => false,
        };
    }

    public function requiresPort(): bool
    {
        return match($this) {
            self::PHP => false,
            self::NodeJS => true,
            self::Static => false,
        };
    }

    public function usesReverseProxy(): bool
    {
        return match($this) {
            self::PHP => false,
            self::NodeJS => true,
            self::Static => false,
        };
    }

    public static function options(): array
    {
        return array_map(fn($case) => [
            'value' => $case->value,
            'label' => $case->label(),
            'description' => $case->description(),
            'icon' => $case->icon(),
            'requires_version' => $case->requiresVersion(),
            'requires_port' => $case->requiresPort(),
            'uses_reverse_proxy' => $case->usesReverseProxy(),
        ], self::cases());
    }
}
