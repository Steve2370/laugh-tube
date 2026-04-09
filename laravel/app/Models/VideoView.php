<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VideoView extends Model
{
    protected $table = 'video_views';

    public $timestamps = false;

    protected $fillable = [
        'video_id',
        'user_id',
        'session_id',
        'ip_address',
        'user_agent',
        'watch_time',
        'watch_percentage',
        'completed',
        'viewed_at',
    ];

    protected $casts = [
        'completed' => 'boolean',
        'watch_percentage' => 'float',
        'viewed_at' => 'datetime',
    ];

    public function video()
    {
        return $this->belongsTo(Video::class);
    }
}
