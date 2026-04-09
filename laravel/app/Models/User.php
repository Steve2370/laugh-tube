<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable;

    protected $table = 'users';

    protected $fillable = [
        'username',
        'email',
        'password',
        'role',
        'is_active',
        'email_verified_at',
        'two_fa_enabled',
        'profile_image',
        'bio',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'two_fa_secret',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'is_active' => 'boolean',
        'two_fa_enabled' => 'boolean',
    ];

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
