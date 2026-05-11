<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Api\PushNotificationService;

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

        try {
            $actorName = $data['actor_name'] ?? 'Quelqu\'un';
            $body = match($data['type']) {
                'like' => "$actorName a aimé votre vidéo",
                'comment' => "$actorName a commenté votre vidéo",
                'comment_like' => "$actorName a aimé votre commentaire",
                'comment_reply' => "$actorName a répondu à votre commentaire",
                'subscribe' => "$actorName s'est abonné à votre chaîne",
                'battle_challenge' => "$actorName vous défie en battle !",
                'battle_accepted' => "$actorName a accepté votre défi !",
                'mention' => "$actorName vous a mentionné dans un commentaire",
                default => "Nouvelle notification de $actorName",
            };

            (new PushNotificationService())->sendToUser(
                $data['user_id'],
                'LaughTube',
                $body,
                ['type' => $data['type'], 'video_id' => $data['video_id'] ?? null]
            );
        } catch (\Exception $e) {
            Log::error('Push notification error: ' . $e->getMessage());
        }
    }
}
