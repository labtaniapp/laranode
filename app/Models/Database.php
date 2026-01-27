<?php

namespace App\Models;

use App\Enums\DatabaseDriver;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Builder;

class Database extends Model
{
    protected $fillable = [
        'name',
        'db_user',
        'db_password',
        'charset',
        'collation',
        'driver',
        'user_id',
    ];

    protected $casts = [
        'db_password' => 'encrypted',
        'driver' => DatabaseDriver::class,
    ];

    /**
     * Check if this database uses MySQL driver.
     */
    public function isMySQL(): bool
    {
        return $this->driver === DatabaseDriver::MySQL;
    }

    /**
     * Check if this database uses PostgreSQL driver.
     */
    public function isPostgreSQL(): bool
    {
        return $this->driver === DatabaseDriver::PostgreSQL;
    }

    /**
     * Get the driver label for display.
     */
    public function getDriverLabelAttribute(): string
    {
        return $this->driver?->label() ?? 'Unknown';
    }

    /**
     * Get the user that owns the database.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the decrypted database password.
     */
    public function getDecryptedPasswordAttribute(): string
    {
        return decrypt($this->db_password);
    }

    /**
     * Set the encrypted database password.
     */
    public function setPasswordAttribute(string $password): void
    {
        $this->attributes['db_password'] = encrypt($password);
    }

    public function scopeMine(Builder $query): Builder
    {
        $user = auth()->user();
        return $query->when($user && !$user->isAdmin(), fn($query) => $query->where('user_id', $user->id));
    }
}
