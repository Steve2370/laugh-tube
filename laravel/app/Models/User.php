<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

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
        // Manquant jusqu'ici : TwoFactorController::enable()/disable() font tous les
        // deux un $user->update(['two_fa_secret' => ...]) - sans ce champ dans
        // $fillable, Eloquent l'ignore silencieusement (pas d'exception, juste un
        // no-op), donc le secret TOTP n'était jamais réellement écrit ni effacé en
        // base. Découvert via le test qui vérifie que désactiver la 2FA efface
        // bien two_fa_secret.
        'two_fa_secret',
        'ip_registration',
        'user_agent_registration',
        'verification_token',
        'verification_token_expires',
        'google_id',
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
