<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JokairVote extends Model
{
    public $timestamps = false;

    protected $fillable = ['entry_id', 'voter_id'];

    public function entry() {
        return $this->belongsTo(JokairEntry::class);
    }
}