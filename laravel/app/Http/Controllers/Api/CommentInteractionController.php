<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CommentInteractionController extends Controller
{
    public function toggleCommentLike(Request $request, $commentId)
    {
        $userId = $request->user()->id;

        $exists = DB::table('comment_likes')
            ->where('comment_id', $commentId)
            ->where('user_id', $userId)
            ->exists();

        if ($exists) {
            DB::table('comment_likes')
                ->where('comment_id', $commentId)
                ->where('user_id', $userId)
                ->delete();
            $liked = false;
        } else {
            DB::table('comment_likes')->insert([
                'comment_id' => $commentId,
                'user_id' => $userId,
                'created_at' => now(),
            ]);
            $liked = true;
        }

        $count = DB::table('comment_likes')->where('comment_id', $commentId)->count();

        return response()->json(['liked' => $liked, 'like_count' => $count]);
    }

    public function getCommentLikeStatus(Request $request, $commentId)
    {
        $count = DB::table('comment_likes')->where('comment_id', $commentId)->count();
        $userId = $request->user()?->id;
        $liked = $userId ? DB::table('comment_likes')
            ->where('comment_id', $commentId)
            ->where('user_id', $userId)
            ->exists() : false;

        return response()->json(['liked' => $liked, 'like_count' => $count]);
    }

    public function getReplies($commentId)
    {
        $replies = DB::table('comment_replies')
            ->join('users', 'comment_replies.user_id', '=', 'users.id')
            ->where('comment_replies.comment_id', $commentId)
            ->orderBy('comment_replies.created_at', 'asc')
            ->select(
                'comment_replies.id',
                'comment_replies.content',
                'comment_replies.created_at',
                'comment_replies.user_id',
                'users.username',
            )
            ->get()
            ->map(function ($reply) {
                $reply->like_count = DB::table('reply_likes')->where('reply_id', $reply->id)->count();
                return $reply;
            });

        return response()->json(['replies' => $replies]);
    }

    public function postReply(Request $request, $commentId)
    {
        $request->validate(['content' => 'required|string|max:1000']);

        $id = DB::table('comment_replies')->insertGetId([
            'comment_id' => $commentId,
            'user_id' => $request->user()->id,
            'content' => $request->input('content'),
            'created_at' => now(),
        ]);

        $reply = DB::table('comment_replies')
            ->join('users', 'comment_replies.user_id', '=', 'users.id')
            ->where('comment_replies.id', $id)
            ->select('comment_replies.*', 'users.username')
            ->first();

        return response()->json(['reply' => $reply], 201);
    }

    public function toggleReplyLike(Request $request, $replyId)
    {
        $userId = $request->user()->id;

        $exists = DB::table('reply_likes')
            ->where('reply_id', $replyId)
            ->where('user_id', $userId)
            ->exists();

        if ($exists) {
            DB::table('reply_likes')
                ->where('reply_id', $replyId)
                ->where('user_id', $userId)
                ->delete();
            $liked = false;
        } else {
            DB::table('reply_likes')->insert([
                'reply_id' => $replyId,
                'user_id' => $userId,
                'created_at' => now(),
            ]);
            $liked = true;
        }

        $count = DB::table('reply_likes')->where('reply_id', $replyId)->count();

        return response()->json(['liked' => $liked, 'like_count' => $count]);
    }

    public function getReplyLikeStatus(Request $request, $replyId)
    {
        $count = DB::table('reply_likes')->where('reply_id', $replyId)->count();
        $userId = $request->user()?->id;
        $liked = $userId ? DB::table('reply_likes')
            ->where('reply_id', $replyId)
            ->where('user_id', $userId)
            ->exists() : false;

        return response()->json(['liked' => $liked, 'like_count' => $count]);
    }

    public function mention(Request $request, int $commentId): JsonResponse
    {
        $request->validate(['mentioned_user_id' => 'required|integer']);

        $comment = DB::table('commentaires')->where('id', $commentId)->first();
        if (!$comment) return response()->json(['error' => 'Commentaire introuvable'], 404);

        $video = DB::table('videos')->where('id', $comment->video_id)->first();

        DB::table('notifications')->insert([
            'user_id' => $request->mentioned_user_id,
            'actor_id' => $request->user()->id,
            'actor_name' => $request->user()->username,
            'type' => 'mention',
            'video_id' => $comment->video_id,
            'comment_id' => $commentId,
            'video_title' => $video?->title,
            'comment_preview' => substr($comment->content, 0, 100),
            'is_read' => false,
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Notification envoyée']);
    }
}
