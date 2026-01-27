<?php

namespace App\Enums;

enum DatabaseDriver: string
{
    case MySQL = 'mysql';
    case PostgreSQL = 'pgsql';
    // Future drivers can be added here:
    // case MariaDB = 'mariadb';
    // case SQLite = 'sqlite';

    public function label(): string
    {
        return match($this) {
            self::MySQL => 'MySQL',
            self::PostgreSQL => 'PostgreSQL',
        };
    }

    public function defaultPort(): int
    {
        return match($this) {
            self::MySQL => 3306,
            self::PostgreSQL => 5432,
        };
    }

    public function defaultCharset(): string
    {
        return match($this) {
            self::MySQL => 'utf8mb4',
            self::PostgreSQL => 'UTF8',
        };
    }

    public function defaultCollation(): string
    {
        return match($this) {
            self::MySQL => 'utf8mb4_unicode_ci',
            self::PostgreSQL => 'en_US.UTF-8',
        };
    }

    public static function options(): array
    {
        return array_map(fn($case) => [
            'value' => $case->value,
            'label' => $case->label(),
            'port' => $case->defaultPort(),
            'charset' => $case->defaultCharset(),
            'collation' => $case->defaultCollation(),
        ], self::cases());
    }
}
