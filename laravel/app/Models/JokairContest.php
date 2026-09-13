<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JokairContest extends Model
{
    protected $fillable = [
        'edition', 'titre', 'submission_start', 'submission_end',
        'vote_start', 'vote_end', 'results_date', 'status',
        'prize_1', 'prize_2', 'prize_3',
    ];

    protected $casts = [
        'submission_start' => 'datetime',
        'submission_end' => 'datetime',
        'vote_start' => 'datetime',
        'vote_end' => 'datetime',
        'results_date' => 'date',
    ];

    public function entries() {
        return $this->hasMany(JokairEntry::class, 'contest_id');
    }

    public function isVotingOpen(): bool {
        // Le statut ('submissions' / 'voting' / 'ended') est le seul bouton que l'admin
        // actionne réellement (aucune tâche planifiée ne bascule automatiquement selon les
        // dates), et c'est aussi ce que l'app iOS utilise pour afficher le bouton de vote.
        // On se base donc uniquement sur le statut ici : sinon, si l'admin passe le statut
        // à "voting" un peu avant/après la fenêtre vote_start/vote_end exacte, l'app affiche
        // le bouton de vote mais le serveur rejette silencieusement chaque vote (403 "Vote
        // fermé") — les dates restent affichées dans la timeline à titre indicatif seulement.
        return $this->status === 'voting';
    }

    public function isSubmissionOpen(): bool {
        return $this->status === 'submissions';
    }
}
