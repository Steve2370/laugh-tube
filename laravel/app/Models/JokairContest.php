<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JokairContest extends Model
{
    protected $fillable = [
        'edition', 'titre', 'submission_start', 'submission_end',
        'vote_start', 'vote_end', 'status', 'prize_1', 'prize_2', 'prize_3',
    ];

    protected $casts = [
        'submission_start' => 'datetime',
        'submission_end' => 'datetime',
        'vote_start' => 'datetime',
        'vote_end' => 'datetime',
    ];

    public function entries() {
        return $this->hasMany(JokairEntry::class, 'contest_id');
    }

    public function isVotingOpen(): bool {
        $now = now();
        return $now->between($this->vote_start, $this->vote_end);
    }

    public function isSubmissionOpen(): bool {
        $now = now();
        return $now->between($this->submission_start, $this->submission_end);
    }
}
