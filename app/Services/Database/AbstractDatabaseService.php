<?php

namespace App\Services\Database;

use App\Contracts\DatabaseServiceInterface;
use App\Enums\DatabaseDriver;
use App\Models\Database;
use App\Models\User;
use Exception;

abstract class AbstractDatabaseService implements DatabaseServiceInterface
{
    protected DatabaseDriver $driver;

    public function createDatabase(array $validated, User $user): Database
    {
        $this->createDatabaseOnServer($validated);

        try {
            $this->createUserOnServer($validated);
        } catch (Exception $e) {
            // Rollback database creation if user creation fails
            $this->dropDatabaseOnServer($validated['name']);
            throw $e;
        }

        return $this->saveDatabaseRecord($validated, $user);
    }

    public function deleteDatabase(Database $database): void
    {
        $this->dropDatabaseOnServer($database->name);
        $this->dropUserOnServer($database->db_user);
        $database->delete();
    }

    protected function saveDatabaseRecord(array $validated, User $user): Database
    {
        return Database::create([
            'name' => $validated['name'],
            'db_user' => $validated['db_user'],
            'db_password' => $validated['db_pass'],
            'charset' => $validated['charset'],
            'collation' => $validated['collation'],
            'driver' => $this->driver->value,
            'user_id' => $user->id,
        ]);
    }

    /**
     * Create the database on the server.
     */
    abstract protected function createDatabaseOnServer(array $validated): void;

    /**
     * Create the database user on the server.
     */
    abstract protected function createUserOnServer(array $validated): void;

    /**
     * Drop the database from the server.
     */
    abstract protected function dropDatabaseOnServer(string $name): void;

    /**
     * Drop the database user from the server.
     */
    abstract protected function dropUserOnServer(string $username): void;
}
