<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ClassementController extends Controller
{
    public function index(): JsonResponse
    {
        $debut = now()->startOfMonth();
        $fin   = now()->endOfMonth();

        $classement = DB::select("
            SELECT
                u.id,
                u.username,
                u.avatar_url,
                COALESCE(SUM(vv.vues), 0)  AS vues,
                COALESCE(SUM(lk.likes), 0) AS likes,
                COALESCE(SUM(vv.vues), 0) + (COALESCE(SUM(lk.likes), 0) * 3) AS score
            FROM users u
            LEFT JOIN videos v ON v.user_id = u.id AND v.deleted_at IS NULL
            LEFT JOIN (
                SELECT video_id, COUNT(*) AS vues
                FROM video_views
                WHERE viewed_at BETWEEN ? AND ?
                GROUP BY video_id
            ) vv ON vv.video_id = v.id
            LEFT JOIN (
                SELECT video_id, COUNT(*) AS likes
                FROM likes
                WHERE created_at BETWEEN ? AND ?
                GROUP BY video_id
            ) lk ON lk.video_id = v.id
            WHERE u.deleted_at IS NULL AND u.role != 'admin'
            GROUP BY u.id, u.username, u.avatar_url
            HAVING COALESCE(SUM(vv.vues), 0) + COALESCE(SUM(lk.likes), 0) > 0
            ORDER BY score DESC
        ", [$debut, $fin, $debut, $fin]);

        $classement = array_map(function ($user, $index) {
            return [
                'rang' => $index + 1,
                'id' => $user->id,
                'username' => $user->username,
                'avatar_url' => $user->avatar_url,
                'vues' => (int) $user->vues,
                'likes' => (int) $user->likes,
                'score' => (int) $user->score,
            ];
        }, $classement, array_keys($classement));

        return response()->json([
            'classement' => $classement,
            'periode' => now()->locale('fr')->monthName . ' ' . now()->year,
            'mise_a_jour' => now()->toDateString(),
        ]);
    }
}
