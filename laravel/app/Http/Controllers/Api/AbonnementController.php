<?php

namespace App\Http\Controllers\Api;

use App\Helpers\NotificationHelper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AbonnementController extends Controller
{
    public function subscribe(Request $request, int $targetUserId): JsonResponse
    {
        $currentUserId = $request->user()->id;

        if ($currentUserId === $targetUserId) {
            return response()->json(['error' => 'Vous ne pouvez pas vous abonner à vous-même'], 400);
        }

        $exists = DB::table('abonnements')
            ->where('subscriber_id', $currentUserId)
            ->where('subscribed_to_id', $targetUserId)
            ->exists();

        if ($exists) {
            return response()->json(['error' => 'Déjà abonné'], 400);
        }

        DB::table('abonnements')->insert([
            'subscriber_id' => $currentUserId,
            'subscribed_to_id' => $targetUserId,
            'created_at' => now(),
        ]);

        NotificationHelper::send([
            'user_id' => $targetUserId,
            'actor_id' => $currentUserId,
            'actor_name' => $request->user()->username,
            'type' => 'subscribe',
        ]);

        $count = DB::table('abonnements')->where('subscribed_to_id', $targetUserId)->count();

        return response()->json([
            'success' => true,
            'is_subscribed' => true,
            'subscribers_count' => $count,
        ]);
    }

    public function unsubscribe(Request $request, int $targetUserId): JsonResponse
    {
        $currentUserId = $request->user()->id;

        DB::table('abonnements')
            ->where('subscriber_id', $currentUserId)
            ->where('subscribed_to_id', $targetUserId)
            ->delete();

        $count = DB::table('abonnements')->where('subscribed_to_id', $targetUserId)->count();

        return response()->json([
            'success' => true,
            'is_subscribed' => false,
            'subscribers_count' => $count,
        ]);
    }

    public function count(int $targetUserId): JsonResponse
    {
        $count = DB::table('abonnements')->where('subscribed_to_id', $targetUserId)->count();
        return response()->json(['subscribers_count' => $count]);
    }

    public function status(Request $request, int $targetUserId): JsonResponse
    {
        $currentUserId = $request->user()?->id;

        $isSubscribed = $currentUserId ? DB::table('abonnements')
            ->where('subscriber_id', $currentUserId)
            ->where('subscribed_to_id', $targetUserId)
            ->exists() : false;

        $count = DB::table('abonnements')->where('subscribed_to_id', $targetUserId)->count();

        return response()->json([
            'success' => true,
            'is_subscribed' => $isSubscribed,
            'subscribers_count' => $count,
        ]);
    }

    public function mySubscribers(Request $request): JsonResponse
    {
        $subscribers = DB::table('abonnements')
            ->join('users', 'abonnements.subscriber_id', '=', 'users.id')
            ->where('abonnements.subscribed_to_id', $request->user()->id)
            ->whereNull('users.deleted_at')
            ->select('users.id', 'users.username', 'users.avatar_url')
            ->orderBy('users.username')
            ->get();

        return response()->json(['subscribers' => $subscribers]);
    }
}
