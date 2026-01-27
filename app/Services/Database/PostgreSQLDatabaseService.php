<?php

namespace App\Services\Database;

use App\Enums\DatabaseDriver;
use App\Models\Database;
use Exception;
use Illuminate\Support\Facades\DB;

class PostgreSQLDatabaseService extends AbstractDatabaseService
{
    protected DatabaseDriver $driver = DatabaseDriver::PostgreSQL;

    protected function getConnection()
    {
        return DB::connection('pgsql');
    }

    protected function createDatabaseOnServer(array $validated): void
    {
        $name = $validated['name'];
        $charset = $validated['charset'] ?? 'UTF8';

        try {
            // PostgreSQL requires connecting to a different database to create a new one
            // We use the default 'postgres' database for this operation
            $this->getConnection()->statement("CREATE DATABASE \"$name\" ENCODING '$charset'");
        } catch (Exception $e) {
            throw new DatabaseServiceException('Failed to create PostgreSQL database: ' . $e->getMessage());
        }
    }

    protected function createUserOnServer(array $validated): void
    {
        $dbUser = $validated['db_user'];
        $dbPass = $validated['db_pass'];
        $name = $validated['name'];

        try {
            // Create user if not exists (PostgreSQL 9.6+)
            $this->getConnection()->statement("
                DO \$\$
                BEGIN
                    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$dbUser') THEN
                        CREATE ROLE \"$dbUser\" WITH LOGIN PASSWORD '$dbPass';
                    END IF;
                END
                \$\$;
            ");

            // Grant all privileges on the database
            $this->getConnection()->statement("GRANT ALL PRIVILEGES ON DATABASE \"$name\" TO \"$dbUser\"");

            // Grant schema privileges (for new objects)
            $this->getConnection()->statement("ALTER DATABASE \"$name\" OWNER TO \"$dbUser\"");
        } catch (Exception $e) {
            throw new DatabaseServiceException('Failed to create PostgreSQL user: ' . $e->getMessage());
        }
    }

    protected function dropDatabaseOnServer(string $name): void
    {
        try {
            // Terminate existing connections before dropping
            $this->getConnection()->statement("
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = '$name'
                AND pid <> pg_backend_pid()
            ");

            $this->getConnection()->statement("DROP DATABASE IF EXISTS \"$name\"");
        } catch (Exception $e) {
            throw new DatabaseServiceException('Failed to drop PostgreSQL database: ' . $e->getMessage());
        }
    }

    protected function dropUserOnServer(string $username): void
    {
        try {
            // Revoke all privileges first
            $this->getConnection()->statement("
                DO \$\$
                BEGIN
                    IF EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$username') THEN
                        DROP ROLE \"$username\";
                    END IF;
                END
                \$\$;
            ");
        } catch (Exception $e) {
            throw new DatabaseServiceException('Failed to drop PostgreSQL user: ' . $e->getMessage());
        }
    }

    public function updatePassword(Database $database, string $newPassword): void
    {
        try {
            $this->getConnection()->statement("ALTER ROLE \"{$database->db_user}\" WITH PASSWORD '$newPassword'");
            $database->update(['db_password' => $newPassword]);
        } catch (Exception $e) {
            throw new DatabaseServiceException('Failed to update PostgreSQL password: ' . $e->getMessage());
        }
    }

    public function getCharsets(): array
    {
        // PostgreSQL encodings
        return [
            'UTF8',
            'LATIN1',
            'LATIN2',
            'WIN1252',
            'SQL_ASCII',
        ];
    }

    public function getCollations(string $charset): array
    {
        try {
            $collations = $this->getConnection()->select("
                SELECT collname FROM pg_collation
                WHERE collencoding = pg_char_to_encoding(?)
                OR collencoding = -1
                LIMIT 50
            ", [$charset]);

            return collect($collations)->pluck('collname')->toArray();
        } catch (Exception $e) {
            // Return common collations as fallback
            return ['en_US.UTF-8', 'C', 'POSIX', 'default'];
        }
    }

    public function testConnection(): bool
    {
        try {
            $this->getConnection()->getPdo();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    public function getDatabaseStats(Database $database): array
    {
        try {
            $stats = $this->getConnection()->select("
                SELECT
                    pg_database_size(?) as size,
                    (SELECT COUNT(*) FROM information_schema.tables
                     WHERE table_catalog = ? AND table_schema = 'public') as tables_count
            ", [$database->name, $database->name]);

            return [
                'size' => $stats[0]->size ?? 0,
                'tables_count' => $stats[0]->tables_count ?? 0,
            ];
        } catch (Exception $e) {
            return ['size' => 0, 'tables_count' => 0];
        }
    }
}
