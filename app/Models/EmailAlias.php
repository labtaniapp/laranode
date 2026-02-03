<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailAlias extends Model
{
    protected $fillable = [
        'email_domain_id',
        'user_id',
        'source_email',
        'destination_email',
        'active',
    ];

    protected $casts = [
        'active' => 'boolean',
    ];

    /**
     * Get the email domain.
     */
    public function emailDomain(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(EmailDomain::class);
    }

    /**
     * Get the user that owns this alias.
     */
    public function user(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
