<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Dislike extends Model
{
    protected $table = 'dislikes';

    public $incrementing = false;
    protected $primaryKey = null;
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'video_id',
    ];

    public function delete()
    {
        return $this->newQuery()
            ->where('user_id', $this->user_id)
            ->where('video_id', $this->video_id)
            ->delete();
    }

    public function video()
    {
        return $this->belongsTo(Video::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
