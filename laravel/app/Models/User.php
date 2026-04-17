<?php

namespace App\Models;

use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, SoftDeletes;

    protected $table = 'users';

    protected $fillable = [
        'username',
        'email',
        'password_hash',
        'role',
        'bio',
        'avatar_url',
        'cover_url',
        'email_verified',
        'two_fa_enabled',
    ];

    protected $hidden = [
        'password_hash',
        'two_fa_secret',
    ];

    protected $casts = [
        'email_verified' => 'boolean',
        'two_fa_enabled' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function videos()
    {
        return $this->hasMany(Video::class);
    }

    public function likes()
    {
        return $this->hasMany(Like::class);
    }

    public function abonnements()
    {
        return $this->hasMany(Abonnement::class);
    }
}
