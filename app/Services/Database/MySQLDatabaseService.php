<?php

namespace App\Services\Database;

use App\Enums\DatabaseDriver;
use App\Models\Database;
use Exception;
use Illuminate\Support\Facades\DB;

class DatabaseServiceException extends Exception {}

class MySQLDatabaseService extends AbstractDatabaseService
{
    protected DatabaseDriver $driver = DatabaseDriver::MySQL;

    protected function createDatabaseOnServer(array $validated): void
    {
        $name = $validated['name'];
        $charset = $validated['charset'];
        $collation = $validated['collation'];

        try {
            DB::statement("CREATE DATABASE `$name` CHARACTER SET $charset COLLATE $collation");
        } catch (Exception $e) {
            throw new DatabaseServiceException('Failed to create MySQL database: ' . $e->getMessage());
        }
    }

    protected function createUserOnServer(array $validated): void
    {
        $dbUser = $validated['db_user'];
        $dbPass = $validated['db_pass'];
        $name = $validated['name'];

        try {
            DB::statement("CREATE USER IF NOT EXISTS `$dbUser`@'localhost' IDENTIFIED BY '$dbPass'");
            DB::statement("GRANT ALL PRIVILEGES ON `$name`.* TO `$dbUser`@'localhost'");
            DB::statement("FLUSH PRIVILEGES");
        } catch (Exception $e) {
            throw new DatabaseServiceException('Failed to create MySQL user: ' . $e->getMessage());
        }
    }

    protected function dropDatabaseOnServer(string $name): void
    {
        try {
            DB::statement("DROP DATABASE IF EXISTS `$name`");
        } catch (Exception $e) {
            throw new DatabaseServiceException('Failed to drop MySQL database: ' . $e->getMessage());
        }
    }

    protected function dropUserOnServer(string $username): void
    {
        try {
            DB::statement("DROP USER IF EXISTS `$username`@'localhost'");
            DB::statement("FLUSH PRIVILEGES");
        } catch (Exception $e) {
            throw new DatabaseServiceException('Failed to drop MySQL user: ' . $e->getMessage());
        }
    }

    public function updatePassword(Database $database, string $newPassword): void
    {
        try {
            DB::statement("ALTER USER `{$database->db_user}`@'localhost' IDENTIFIED BY '$newPassword'");
            DB::statement("FLUSH PRIVILEGES");

            $database->update(['db_password' => $newPassword]);
        } catch (Exception $e) {
            throw new DatabaseServiceException('Failed to update MySQL password: ' . $e->getMessage());
        }
    }

    public function getCharsets(): array
    {
        $charsets = DB::select("SHOW CHARACTER SET");
        return collect($charsets)->pluck('Charset')->toArray();
    }

    public function getCollations(string $charset): array
    {
        $collations = DB::select("SHOW COLLATION WHERE Charset = ?", [$charset]);
        return collect($collations)->pluck('Collation')->toArray();
    }

    public function testConnection(): bool
    {
        try {
            DB::connection('mysql')->getPdo();
            return true;
        } catch (Exception $e) {
            return false;
        }
    }

    public function getDatabaseStats(Database $database): array
    {
        try {
            $stats = DB::select("
                SELECT
                    SUM(data_length + index_length) as size,
                    COUNT(*) as tables_count
                FROM information_schema.tables
                WHERE table_schema = ?
            ", [$database->name]);

            return [
                'size' => $stats[0]->size ?? 0,
                'tables_count' => $stats[0]->tables_count ?? 0,
            ];
        } catch (Exception $e) {
            return ['size' => 0, 'tables_count' => 0];
        }
    }
}
