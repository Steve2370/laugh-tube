<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
        $limit = min((int) $request->get('limit', 10), 50);
        $period = min((int) $request->get('period', 7), 30);

        $videos = Video::with('user:id,username')
            ->whereNull('deleted_at')
            ->withCount([
                'views as recent_views' => fn($q) =>
                $q->where('viewed_at', '>=', now()->subDays($period)),
                'likes as recent_likes' => fn($q) =>
                $q->where('created_at', '>=', now()->subDays($period)),
            ])
            ->orderByRaw('((SELECT COUNT(*) FROM video_views WHERE video_views.video_id = videos.id AND viewed_at >= ?) * 2 + (SELECT COUNT(*) FROM likes WHERE likes.video_id = videos.id AND likes.created_at >= ?) * 3) DESC', [
                now()->subDays($period),
                now()->subDays($period),
            ])
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
            ->orderByRaw('((SELECT COUNT(*) FROM video_views WHERE video_views.video_id = videos.id) + (SELECT COUNT(*) FROM likes WHERE likes.video_id = videos.id) * 3) DESC')
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

    public function destroy(Request $request, int $id): JsonResponse
    {
        $video = Video::whereNull('deleted_at')->findOrFail($id);

        if ($video->user_id !== $request->user()->id && $request->user()->role !== 'admin') {
            return response()->json(['error' => 'Non autorisé'], 403);
        }

        $video->update(['deleted_at' => now()]);

        return response()->json(['message' => 'Vidéo supprimée']);
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

    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'video' => 'required|file|mimes:mp4,avi,mov,webm,quicktime|max:512000',
            'title' => 'required|string|min:3|max:100',
            'description' => 'nullable|string|max:5000',
        ]);

        $file = $request->file('video');
        $filename = uniqid() . '.' . $file->getClientOriginalExtension();

        $uploadPath = '/var/www/html/uploads/videos/';
        $file->move($uploadPath, $filename);

        $video = DB::table('videos')->insertGetId([
            'user_id' => $request->user()->id,
            'title' => $request->input('title'),
            'description' => $request->input('description', ''),
            'filename' => $filename,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'video_id' => $video,
            'message' => 'Vidéo uploadée avec succès, encodage en cours...',
        ]);
    }
}
