<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VideoController extends Controller
{
    public function index(): JsonResponse
    {
        $videos = Video::with('user:id,username')
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($v) => $this->formatVideo($v));

        return response()->json(['videos' => $videos]);
    }

    public function trending(Request $request): JsonResponse
    {
        $limit  = min((int) $request->get('limit', 10), 50);
        $period = min((int) $request->get('period', 7), 30);

        $videos = Video::with('user:id,username')
            ->whereNull('deleted_at')
            ->withCount([
                'views as recent_views' => fn($q) =>
                $q->where('viewed_at', '>=', now()->subDays($period)),
                'likes as recent_likes' => fn($q) =>
                $q->where('created_at', '>=', now()->subDays($period)),
            ])
            ->orderByRaw('(recent_views * 2 + recent_likes * 3) DESC')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn($v) => $this->formatVideo($v));

        return response()->json(['videos' => $videos]);
    }

    public function popular(Request $request): JsonResponse
    {
        $limit = min((int) $request->get('limit', 10), 50);

        $videos = Video::with('user:id,username')
            ->whereNull('deleted_at')
            ->withCount(['views', 'likes'])
            ->orderByRaw('(views_count + likes_count * 3) DESC')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn($v) => $this->formatVideo($v));

        return response()->json(['videos' => $videos]);
    }

    public function recent(Request $request): JsonResponse
    {
        $limit = min((int) $request->get('limit', 20), 50);

        $videos = Video::with('user:id,username')
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->map(fn($v) => $this->formatVideo($v));

        return response()->json(['videos' => $videos]);
    }

    public function show(int $id): JsonResponse
    {
        $video = Video::with('user:id,username')
            ->whereNull('deleted_at')
            ->findOrFail($id);

        return response()->json(['video' => $this->formatVideo($video)]);
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
            'user_id' => $video->user_id,
            'recent_views' => $video->recent_views ?? null,
            'recent_likes' => $video->recent_likes ?? null,
            'views_count' => $video->views_count  ?? null,
            'likes_count' => $video->likes_count  ?? null,
        ];
    }
}
