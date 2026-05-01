<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $limit = min((int) $request->get('limit', 20), 50);
        $offset = (int) $request->get('offset', 0);

        $notifications = DB::table('notifications')
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->offset($offset)
            ->select('notifications.*', 'users.avatar_url as actor_avatar')
            ->get();

        $unreadCount = DB::table('notifications')
            ->where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        $total = DB::table('notifications')
            ->where('user_id', $user->id)
            ->count();

        return response()->json([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
            'total' => $total,
        ]);
    }

    public function markAsRead(Request $request, int $id): JsonResponse
    {
        DB::table('notifications')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['message' => 'Notification marquée comme lue']);
    }

    public function markAllAsRead(Request $request): JsonResponse
    {
        DB::table('notifications')
            ->where('user_id', $request->user()->id)
            ->where('is_read', false)
            ->update(['is_read' => true, 'read_at' => now()]);

        return response()->json(['message' => 'Toutes les notifications marquées comme lues']);
    }

    public function deleteAllRead(Request $request): JsonResponse
    {
        DB::table('notifications')
            ->where('user_id', $request->user()->id)
            ->where('is_read', true)
            ->delete();

        return response()->json(['message' => 'Notifications lues supprimées']);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        DB::table('notifications')
            ->where('id', $id)
            ->where('user_id', $request->user()->id)
            ->delete();

        return response()->json(['message' => 'Notification supprimée']);
    }
}
