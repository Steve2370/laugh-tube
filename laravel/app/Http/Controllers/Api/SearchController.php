<?php

namespace App\Http\Controllers\Api;

use App\Helpers\BlockHelper;
use App\Http\Controllers\Controller;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class SearchController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $q = trim((string) $request->query('q', ''));

        if (mb_strlen($q) < 2) {
            return response()->json(['videos' => [], 'total' => 0]);
        }

        $limit = min((int) $request->query('limit', 20), 50);
        $offset = max((int) $request->query('offset', 0), 0);
        $like = '%' . $q . '%';

        $query = Video::with('user:id,username,avatar_url')
            ->withCount(['commentaires', 'likes'])
            ->whereNull('deleted_at')
            ->where(function ($w) use ($like) {
                $w->where('title', 'ILIKE', $like)
                  ->orWhere('description', 'ILIKE', $like)
                  ->orWhereHas('user', function ($uq) use ($like) {
                      $uq->where('username', 'ILIKE', $like);
                  });
            })
            ->when($request->bearerToken(), function ($qBuilder) use ($request) {
                $user = PersonalAccessToken::findToken($request->bearerToken())?->tokenable;
                if ($user) {
                    $qBuilder->whereNotIn('user_id', BlockHelper::blockedUserIds($user->id));
                }
            });

        $total = (clone $query)->count();

        $videos = $query
            ->orderByRaw("CASE WHEN title ILIKE ? THEN 0 ELSE 1 END", [$like])
            ->orderBy('views', 'desc')
            ->orderBy('created_at', 'desc')
            ->skip($offset)
            ->take($limit)
            ->get()
            ->map(fn ($v) => $this->formatVideo($v));

        return response()->json(['videos' => $videos, 'total' => $total]);
    }

    private function formatVideo(Video $video): array
    {
        return [
            'id' => $video->id,
            'title' => $video->title,
            'description' => $video->description,
            'filename' => $video->filename,
            'thumbnail' => $video->thumbnail,
            'duration' => $video->duration,
            'views' => $video->views,
            'created_at' => $video->created_at,
            'username' => $video->user?->username,
            'avatar_url' => $video->user?->avatar_url,
            'user_id' => $video->user_id,
            'likes_count' => $video->likes_count ?? 0,
            'comments_count' => $video->commentaires_count ?? 0,
            'is_jokair' => $video->jokairEntry()->where('validated', true)->exists(),
        ];
    }
}
