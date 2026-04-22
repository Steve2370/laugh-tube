<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;

class NotificationHelper
{
    public static function send(array $data): void
    {
        if ($data['user_id'] === $data['actor_id']) return;

        DB::table('notifications')->insert([
            'user_id' => $data['user_id'],
            'actor_id' => $data['actor_id'],
            'type' => $data['type'],
            'video_id' => $data['video_id'] ?? null,
            'comment_id' => $data['comment_id'] ?? null,
            'actor_name' => isset($data['actor_name']) ? substr($data['actor_name'], 0, 50) : null,
            'video_title' => isset($data['video_title']) ? substr($data['video_title'], 0, 100) : null,
            'comment_preview' => isset($data['comment_preview']) ? substr($data['comment_preview'], 0, 255) : null,
            'is_read' => false,
            'created_at' => now(),
        ]);
    }
}
