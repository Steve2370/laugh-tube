<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Like;
use App\Models\Dislike;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LikeController extends Controller
{
    public function like(Request $request, int $id): JsonResponse
    {
        $video = Video::whereNull('deleted_at')->findOrFail($id);
        $userId = $request->user()->id;

        $existing = Like::where('user_id', $userId)
            ->where('video_id', $id)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['message' => 'Like retiré', 'liked' => false]);
        }

        Dislike::where('user_id', $userId)->where('video_id', $id)->delete();

        Like::create(['user_id' => $userId, 'video_id' => $id]);

        return response()->json(['message' => 'Vidéo likée', 'liked' => true]);
    }

    public function dislike(Request $request, int $id): JsonResponse
    {
        $video = Video::whereNull('deleted_at')->findOrFail($id);
        $userId = $request->user()->id;

        $existing = Dislike::where('user_id', $userId)
            ->where('video_id', $id)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json(['message' => 'Dislike retiré', 'disliked' => false]);
        }

        Like::where('user_id', $userId)->where('video_id', $id)->delete();

        Dislike::create(['user_id' => $userId, 'video_id' => $id]);

        return response()->json(['message' => 'Vidéo dislikée', 'disliked' => true]);
    }

    // GET /api/v2/videos/{id}/reactions
    public function reactions(Request $request, int $id): JsonResponse
    {
        $video = Video::whereNull('deleted_at')->findOrFail($id);

        $likes = Like::where('video_id', $id)->count();
        $dislikes = Dislike::where('video_id', $id)->count();

        $userReaction = null;

        try {
            $user = $request->user('sanctum');
            if ($user) {
                if (Like::where('video_id', $id)->where('user_id', $user->id)->exists()) {
                    $userReaction = 'like';
                } elseif (Dislike::where('video_id', $id)->where('user_id', $user->id)->exists()) {
                    $userReaction = 'dislike';
                }
            }
        } catch (\Exception $e) {

        }

        return response()->json([
            'likes' => $likes,
            'dislikes' => $dislikes,
            'user_reaction' => $userReaction,
        ]);
    }
}
