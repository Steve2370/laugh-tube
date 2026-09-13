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
        $subscribersCount = \DB::table('abonnements')->where('subscribed_to_id', $id)->count();

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
                'subscribers_count' => $subscribersCount,
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        $validated = $request->validate([
            'username' => [
                'sometimes', 'string', 'min:3', 'max:50',
                'unique:users,username,' . $user->id,
                'regex:/^[a-zA-Z0-9_-]+$/',
            ],
            'bio' => 'sometimes|nullable|string|max:500',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
        ], [
            'username.regex' => "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores",
        ]);
        $user->update($validated);
        return response()->json([
            'message' => 'Profil mis à jour',
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
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
                'likes' => \DB::table('likes')->where('video_id', $v->id)->count(),
                'likes_count' => \DB::table('likes')->where('video_id', $v->id)->count(),
            ]);

        return response()->json(['videos' => $videos]);
    }

    public function cancelDeletion(Request $request): JsonResponse
    {
        $user = $request->user();

        if (empty($user->deletion_scheduled_at)) {
            return response()->json(['error' => 'Aucune suppression en attente'], 400);
        }

        $user->deletion_scheduled_at = null;
        if (method_exists($user, 'trashed') && $user->trashed()) {
            $user->restore();
        } else {
            $user->save();
        }

        return response()->json(['success' => true, 'message' => 'Suppression du compte annulée']);
    }

    public function deleteAccount(Request $request): JsonResponse
    {
        // Faille 2.2 de l'audit du 12/09 : aucune réauthentification n'était exigée
        // (un token volé suffisait) et la suppression était un DELETE SQL immédiat
        // et irréversible, incohérent avec le reste de l'application qui utilise
        // un soft delete partout ailleurs (SoftDeletes sur User) et, côté backend
        // legacy, un délai de grâce de 30 jours avant suppression définitive.
        $request->validate([
            'password' => 'required|string',
        ]);

        $user = $request->user();

        if (!Hash::check($request->password, $user->password_hash)) {
            return response()->json(['error' => 'Mot de passe incorrect'], 400);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['success' => true, 'message' => 'Compte supprimé']);
    }

    public function stats(int $id): JsonResponse
    {
        $totalVideos = Video::where('user_id', $id)->whereNull('deleted_at')->count();
        $totalViews = Video::where('user_id', $id)->whereNull('deleted_at')->sum('views');
        $totalLikes = \DB::table('likes')
            ->join('videos', 'likes.video_id', '=', 'videos.id')
            ->where('videos.user_id', $id)
            ->whereNull('videos.deleted_at')
            ->count();
        $totalComments = \DB::table('commentaires')
            ->join('videos', 'commentaires.video_id', '=', 'videos.id')
            ->where('videos.user_id', $id)
            ->whereNull('videos.deleted_at')
            ->count();

        return response()->json([
            'stats' => [
                'stats' => [
                    'total_videos' => $totalVideos,
                    'total_views' => $totalViews,
                    'total_likes' => $totalLikes,
                    'total_commentaires' => $totalComments,
                ]
            ]
        ]);
    }
}
