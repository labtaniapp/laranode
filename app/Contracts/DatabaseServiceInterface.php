<?php

namespace App\Contracts;

use App\Models\Database;
use App\Models\User;

interface DatabaseServiceInterface
{
    /**
     * Create a new database and user.
     */
    public function createDatabase(array $validated, User $user): Database;

    /**
     * Delete a database and its user.
     */
    public function deleteDatabase(Database $database): void;

    /**
     * Update database user password.
     */
    public function updatePassword(Database $database, string $newPassword): void;

    /**
     * Get available charsets for this driver.
     */
    public function getCharsets(): array;

    /**
     * Get available collations for a given charset.
     */
    public function getCollations(string $charset): array;

    /**
     * Test connection to the database server.
     */
    public function testConnection(): bool;

    /**
     * Get database statistics (size, tables count, etc.).
     */
    public function getDatabaseStats(Database $database): array;
}
