<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dislike extends Model
{
    protected $table = 'dislikes';

    public $incrementing = false;
    protected $primaryKey = null;

    protected $fillable = [
        'user_id',
        'video_id',
    ];

    public function video()
    {
        return $this->belongsTo(Video::class);
    }
}
