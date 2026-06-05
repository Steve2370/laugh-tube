<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JokairWatch extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'entry_id', 'user_id', 'session_id',
        'seconds_watched', 'video_duration',
    ];

    public function entry() {
        return $this->belongsTo(JokairEntry::class);
    }
}