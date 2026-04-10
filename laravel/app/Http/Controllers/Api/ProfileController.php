<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    public function show(int $id): JsonResponse
    {
        $user = User::whereNull('deleted_at')->findOrFail($id);

        $videoCount = Video::where('user_id', $id)->whereNull('deleted_at')->count();
        $totalViews = Video::where('user_id', $id)->whereNull('deleted_at')->sum('views');

        return response()->json([
            'profile' => [
                'id' => $user->id,
                'username' => $user->username,
                'bio' => $user->bio,
                'avatar_url' => $user->avatar_url,
                'cover_url' => $user->cover_url,
                'role' => $user->role,
                'created_at' => $user->created_at,
                'video_count' => $videoCount,
                'total_views' => $totalViews,
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'username' => 'sometimes|string|min:3|max:50|unique:users,username,' . $user->id,
            'bio' => 'sometimes|nullable|string|max:500',
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Profil mis à jour',
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'bio' => $user->bio,
                'avatar_url' => $user->avatar_url,
            ],
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password_hash)) {
            return response()->json(['error' => 'Mot de passe actuel incorrect'], 403);
        }

        $user->update(['password_hash' => Hash::make($validated['password'])]);

        return response()->json(['message' => 'Mot de passe mis à jour']);
    }

    public function videos(int $id): JsonResponse
    {
        User::whereNull('deleted_at')->findOrFail($id);

        $videos = Video::where('user_id', $id)
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($v) => [
                'id' => $v->id,
                'title' => $v->title,
                'description' => $v->description,
                'filename' => $v->filename,
                'thumbnail' => $v->thumbnail,
                'views' => $v->views,
                'created_at' => $v->created_at,
                'user_id' => $v->user_id,
            ]);

        return response()->json(['videos' => $videos]);
    }
}
