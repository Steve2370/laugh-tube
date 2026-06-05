<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JokairEntry extends Model
{
    protected $fillable = [
        'contest_id', 'user_id', 'video_id',
        'vote_count', 'watch_seconds_total', 'watch_count', 'score', 'rank',
    ];

    public function contest() {
        return $this->belongsTo(JokairContest::class);
    }
    public function user() {
        return $this->belongsTo(User::class);
    }
    public function video() {
        return $this->belongsTo(Video::class);
    }
    public function votes() {
        return $this->hasMany(JokairVote::class, 'entry_id');
    }
    public function watches() {
        return $this->hasMany(JokairWatch::class, 'entry_id');
    }

    public function recalculateScore(): void
    {
        $maxVotes = JokairEntry::where('contest_id', $this->contest_id)->max('vote_count') ?: 1;
        $maxWatch = JokairEntry::where('contest_id', $this->contest_id)->max('watch_count') ?: 1;
        $voteRatio = $this->vote_count / $maxVotes;
        $watchRatio = $this->watch_count / $maxWatch;

        $this->score = round(($voteRatio * 0.70) + ($watchRatio * 0.30), 4);
        $this->save();
    }
}
