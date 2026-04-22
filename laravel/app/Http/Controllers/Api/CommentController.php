<?php

namespace App\Http\Controllers\Api;

use App\Helpers\NotificationHelper;
use App\Http\Controllers\Controller;
use App\Models\Commentaire;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CommentController extends Controller
{
    public function index(int $id): JsonResponse
    {
        $video = Video::whereNull('deleted_at')->findOrFail($id);

        $comments = Commentaire::with('user:id,username,avatar_url')
            ->where('video_id', $id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'content' => $c->content,
                'created_at' => $c->created_at,
                'user_id' => $c->user_id,
                'username' => $c->user?->username,
                'avatar_url' => $c->user?->avatar_url,
            ]);

        return response()->json(['comments' => $comments]);
    }

    public function store(Request $request, int $id): JsonResponse
    {
        $video = Video::whereNull('deleted_at')->findOrFail($id);

        $validated = $request->validate([
            'content' => 'required|string|min:1|max:2000',
        ]);

        $comment = Commentaire::create([
            'video_id' => $id,
            'user_id' => $request->user()->id,
            'content' => trim($validated['content']),
        ]);

        $comment->load('user:id,username,avatar_url');

        NotificationHelper::send([
            'user_id' => $video->user_id,
            'actor_id' => $request->user()->id,
            'actor_name' => $request->user()->username,
            'type' => 'comment',
            'video_id' => $id,
            'video_title' => $video->title,
            'comment_id' => $comment->id,
            'comment_preview' => substr($comment->content, 0, 100),
        ]);

        return response()->json([
            'message' => 'Commentaire ajouté',
            'comment' => [
                'id' => $comment->id,
                'content' => $comment->content,
                'created_at' => $comment->created_at,
                'user_id' => $comment->user_id,
                'username' => $comment->user?->username,
                'avatar_url' => $comment->user?->avatar_url,
            ],
        ], 201);
    }

    public function destroy(Request $request, int $videoId, int $commentId): JsonResponse
    {
        $comment = Commentaire::where('video_id', $videoId)
            ->findOrFail($commentId);

        if ($comment->user_id !== $request->user()->id && $request->user()->role !== 'admin') {
            return response()->json(['error' => 'Non autorisé'], 403);
        }

        $comment->delete();

        return response()->json(['message' => 'Commentaire supprimé']);
    }
}
