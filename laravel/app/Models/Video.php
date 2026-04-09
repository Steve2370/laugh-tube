<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Video extends Model
{
    use SoftDeletes;

    protected $table = 'videos';

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'filename',
        'thumbnail',
        'duration',
        'views',
        'status',
    ];

    protected $casts = [
        'duration' => 'integer',
        'views' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function views()
    {
        return $this->hasMany(VideoView::class);
    }

    public function likes()
    {
        return $this->hasMany(Like::class);
    }

    public function dislikes()
    {
        return $this->hasMany(Dislike::class);
    }

    public function commentaires()
    {
        return $this->hasMany(Commentaire::class);
    }

    public function scopeTrending($query, $days = 7)
    {
        return $query->withCount([
            'views as recent_views' => fn($q) =>
            $q->where('viewed_at', '>=', now()->subDays($days)),
            'likes as recent_likes' => fn($q) =>
            $q->where('created_at', '>=', now()->subDays($days)),
        ])
            ->orderByRaw('(recent_views * 2 + recent_likes * 3) DESC');
    }

    public function scopePopular($query)
    {
        return $query->withCount(['views', 'likes'])
            ->orderByRaw('(views_count + likes_count * 3) DESC');
    }
}
