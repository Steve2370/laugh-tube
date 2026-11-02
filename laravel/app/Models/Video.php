<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

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

    public function jokairEntry()
    {
        return $this->hasOne(JokairEntry::class, 'video_id');
    }

    /**
     * Badge Jok-Air à afficher sur la vidéo.
     * - is_jokair / jokair_entry_id : seulement pendant un concours ouvert (soumissions ou votes)
     * - jokair_champion : édition gagnée (rank = 1 d'un concours terminé), badge permanent
     */
    public function jokairBadge(): array
    {
        $rows = DB::table('jokair_entries as je')
            ->join('jokair_contests as jc', 'jc.id', '=', 'je.contest_id')
            ->where('je.video_id', $this->id)
            ->where('je.validated', true)
            ->get(['je.id', 'je.rank', 'jc.status', 'jc.edition']);

        $open = $rows->first(fn ($r) => in_array($r->status, ['submissions', 'voting'], true));
        $champion = $rows->first(fn ($r) => $r->status === 'ended' && (int) $r->rank === 1);

        return [
            'is_jokair'       => (bool) $open,
            'jokair_entry_id' => $open?->id,
            'jokair_champion' => $champion?->edition,
        ];
    }
}
