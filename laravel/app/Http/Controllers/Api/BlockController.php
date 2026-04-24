<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BlockController extends Controller
{
    public function block(Request $request, int $id): JsonResponse
    {
        if ($request->user()->id === $id) {
            return response()->json(['error' => 'Vous ne pouvez pas vous bloquer vous-même'], 400);
        }

        DB::table('blocks')->insertOrIgnore([
            'blocker_id' => $request->user()->id,
            'blocked_id' => $id,
            'created_at' => now(),
        ]);

        return response()->json(['success' => true, 'is_blocked' => true]);
    }

    public function unblock(Request $request, int $id): JsonResponse
    {
        DB::table('blocks')
            ->where('blocker_id', $request->user()->id)
            ->where('blocked_id', $id)
            ->delete();

        return response()->json(['success' => true, 'is_blocked' => false]);
    }

    public function status(Request $request, int $id): JsonResponse
    {
        $isBlocked = DB::table('blocks')
            ->where('blocker_id', $request->user()->id)
            ->where('blocked_id', $id)
            ->exists();

        return response()->json(['is_blocked' => $isBlocked]);
    }

    public function myBlocked(Request $request): JsonResponse
    {
        $blocked = DB::table('blocks')
            ->join('users', 'blocks.blocked_id', '=', 'users.id')
            ->where('blocks.blocker_id', $request->user()->id)
            ->whereNull('users.deleted_at')
            ->select('users.id', 'users.username', 'users.avatar_url', 'blocks.created_at')
            ->get();

        return response()->json(['blocked' => $blocked]);
    }
}
