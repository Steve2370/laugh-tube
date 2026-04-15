<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

class AdminController extends Controller
{
    public function getUsers(Request $request): JsonResponse
    {
        $users = User::whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($u) => [
                'id' => $u->id,
                'username' => $u->username,
                'email' => $u->email,
                'role' => $u->role,
                'avatar_url' => $u->avatar_url,
                'email_verified' => $u->email_verified,
                'created_at' => $u->created_at,
            ]);

        return response()->json(['users' => $users]);
    }

    public function deleteUser(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->update(['deleted_at' => now()]);
        return response()->json(['message' => 'Utilisateur supprimé']);
    }

    public function suspendUser(int $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->update(['deleted_at' => now()]);
        return response()->json(['message' => 'Utilisateur suspendu']);
    }

    public function unsuspendUser(int $id): JsonResponse
    {
        $user = User::withTrashed()->findOrFail($id);
        $user->update(['deleted_at' => null]);
        return response()->json(['message' => 'Utilisateur réactivé']);
    }

    public function restoreUser(int $id): JsonResponse
    {
        $user = User::withTrashed()->findOrFail($id);
        $user->update(['deleted_at' => null]);
        return response()->json(['message' => 'Utilisateur restauré']);
    }

    public function getVideos(): JsonResponse
    {
        $videos = Video::with('user:id,username')
            ->withTrashed()
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($v) => [
                'id' => $v->id,
                'title' => $v->title,
                'filename' => $v->filename,
                'thumbnail' => $v->thumbnail,
                'views' => $v->views,
                'created_at' => $v->created_at,
                'deleted_at' => $v->deleted_at,
                'username' => $v->user?->username,
                'user_id' => $v->user_id,
            ]);

        return response()->json(['videos' => $videos]);
    }

    public function deleteVideo(int $id): JsonResponse
    {
        $video = Video::withTrashed()->findOrFail($id);
        $video->update(['deleted_at' => now()]);
        return response()->json(['message' => 'Vidéo supprimée']);
    }

    public function getSignalements(): JsonResponse
    {
        $signalements = DB::table('signalements')
            ->leftJoin('users', 'signalements.reporter_id', '=', 'users.id')
            ->leftJoin('videos', 'signalements.video_id', '=', 'videos.id')
            ->select('signalements.*', 'users.username as reporter_username', 'videos.title as video_title')
            ->orderBy('signalements.created_at', 'desc')
            ->get();

        return response()->json(['signalements' => $signalements]);
    }

    public function updateSignalement(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'statut' => 'required|string|in:pending,reviewed,dismissed',
        ]);

        DB::table('signalements')->where('id', $id)->update(['statut' => $validated['statut']]);

        return response()->json(['message' => 'Signalement mis à jour']);
    }

    public function getStats(): JsonResponse
    {
        $totalUsers = User::whereNull('deleted_at')->count();
        $totalVideos = Video::whereNull('deleted_at')->count();
        $totalViews = Video::whereNull('deleted_at')->sum('views');

        return response()->json([
            'stats' => [
                'total_users' => $totalUsers,
                'total_videos' => $totalVideos,
                'total_views' => $totalViews,
            ],
        ]);
    }

    public function getContact(): JsonResponse
    {
        $inbox = DB::table('contact_messages')->orderBy('sent_at', 'desc')->get();
        return response()->json(['inbox' => $inbox]);
    }

    public function getMessages(): JsonResponse
    {
        $messages = DB::table('admin_messages')
            ->join('users as admins', 'admin_messages.admin_id', '=', 'admins.id')
            ->join('users as recipients', 'admin_messages.user_id', '=', 'recipients.id')
            ->select(
                'admin_messages.*',
                'admins.username as admin_username',
                'recipients.username as recipient_username',
                'recipients.email as recipient_email'
            )
            ->orderBy('admin_messages.created_at', 'desc')
            ->get();

        return response()->json(['messages' => $messages]);
    }

    public function sendMessage(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|integer|exists:users,id',
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
        ]);

        DB::table('admin_messages')->insert([
            'admin_id' => $request->user()->id,
            'user_id' => $validated['user_id'],
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $user = User::find($validated['user_id']);
        if ($user) {
            try {
                $response = Http::withHeaders([
                    'Authorization' => 'Bearer ' . config('services.resend.api_key'),
                    'Content-Type' => 'application/json',
                ])->post('https://api.resend.com/emails', [
                    'from' => 'LaughTube <noreply@laughtube.ca>',
                    'to' => [$user->email],
                    'subject' => '[LaughTube] ' . $validated['subject'],
                    'html' => nl2br(htmlspecialchars($validated['message'])),
                    'reply_to' => 'legal@laughtube.ca',
                ]);

                if (!$response->successful()) {
                    \Log::error('Resend error: ' . $response->body());
                    return response()->json(['message' => 'Message sauvegardé mais erreur email: ' . $response->body()], 500);
                }
            } catch (\Exception $e) {
                \Log::error('Email send failed: ' . $e->getMessage());
                return response()->json(['message' => 'Erreur email: ' . $e->getMessage()], 500);
            }
        }

        return response()->json(['message' => 'Message envoyé avec succès']);
    }

    public function updateContact(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'statut' => 'required|string|in:unread,read,replied',
        ]);

        DB::table('contact_messages')->where('id', $id)->update(['statut' => $validated['statut']]);

        return response()->json(['message' => 'Message mis à jour']);
    }
}
