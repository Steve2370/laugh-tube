<?php

namespace App\Http\Controllers\Api;

use App\Services\EmailService;
use App\Services\EmailTemplate;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Video;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use App\Helpers\GeoIPHelper;

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
                'last_login' => $u->last_login,
                'ip_registration' => $u->ip_registration,
                'country' => GeoIPHelper::getCountry($u->ip_registration),
                'country_code' => GeoIPHelper::getCountryCode($u->ip_registration),
                'user_agent' => $u->user_agent_registration,
                'login_count' => DB::table('personal_access_tokens')
                    ->where('tokenable_id', $u->id)
                    ->count(),
            ]);
        return response()->json(['users' => $users]);
    }

    public function deleteUser(int $id): JsonResponse
    {
        $user = User::withTrashed()->findOrFail($id);

        if ($user->role === 'admin') {
            return response()->json(['error' => 'Impossible de supprimer un admin'], 403);
        }

        $videos = DB::table('videos')->where('user_id', $id)->get();
        foreach ($videos as $video) {
            $uploadsPath = '/var/www/html/public/uploads/';
            @unlink($uploadsPath . 'videos/' . $video->filename);
            @unlink($uploadsPath . 'encoded/' . pathinfo($video->filename, PATHINFO_FILENAME) . '_encoded.mp4');
            @unlink($uploadsPath . 'thumbnails/' . pathinfo($video->filename, PATHINFO_FILENAME) . '_thumb.jpg');
            DB::table('encoding_queue')->where('video_id', $video->id)->delete();
        }
        DB::table('videos')->where('user_id', $id)->delete();
        DB::table('personal_access_tokens')->where('tokenable_id', $id)->delete();
        DB::table('abonnements')->where('subscriber_id', $id)->orWhere('subscribed_to_id', $id)->delete();
        DB::table('likes')->where('user_id', $id)->delete();
        DB::table('commentaires')->where('user_id', $id)->delete();
        DB::table('signalements')->where('reporter_id', $id)->delete();
        DB::table('admin_messages')->where('user_id', $id)->delete();
        DB::table('video_views')->where('user_id', $id)->delete();

        $user->forceDelete();

        return response()->json(['message' => 'Compte supprimé définitivement']);
    }

    public function suspendUser(int $id): JsonResponse
    {
        $input = request()->json()->all();
        $hours = max(1, min(8760, (int)($input['hours'] ?? 24)));
        $until = now()->addHours($hours);

        DB::table('users')
            ->where('id', $id)
            ->update(['account_locked_until' => $until]);

        return response()->json([
            'message' => "Compte suspendu jusqu'au " . $until->format('d/m/Y H:i'),
            'until' => $until,
        ]);
    }

    public function unsuspendUser(int $id): JsonResponse
    {
        DB::table('users')
            ->where('id', $id)
            ->update(['account_locked_until' => null, 'failed_login_attempts' => 0]);

        return response()->json(['message' => 'Suspension levée']);
    }

    public function restoreUser(int $id): JsonResponse
    {
        DB::table('users')
            ->where('id', $id)
            ->update(['deleted_at' => null, 'account_locked_until' => null, 'failed_login_attempts' => 0]);

        return response()->json(['message' => 'Compte restauré']);
    }

    public function getSignalements(): JsonResponse
    {
        $signalements = DB::table('signalements')
            ->leftJoin('users as reporters', 'signalements.reporter_id', '=', 'reporters.id')
            ->leftJoin('videos', 'signalements.video_id', '=', 'videos.id')
            ->leftJoin('users as reported_users', 'signalements.reported_user_id', '=', 'reported_users.id')
            ->select(
                'signalements.*',
                'reporters.username as reporter_username',
                'videos.title as video_title',
                'reported_users.username as reported_user_username'
            )
            ->orderBy('signalements.created_at', 'desc')
            ->get();

        return response()->json(['signalements' => $signalements]);
    }

    public function getVideos(): JsonResponse
    {
        $videos = Video::with('user:id,username')
            ->withCount(['likes', 'dislikes', 'commentaires'])
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn($v) => [
                'id' => $v->id,
                'title' => $v->title,
                'filename' => $v->filename,
                'thumbnail' => $v->thumbnail,
                'thumbnail_url' => $v->thumbnail ? "/uploads/thumbnails/{$v->thumbnail}" : null,
                'views' => $v->views,
                'likes' => $v->likes_count ?? 0,
                'dislikes' => $v->dislikes_count ?? 0,
                'comments' => $v->commentaires_count ?? 0,
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
        DB::table('videos')->where('id', $id)->update(['deleted_at' => now()]);
        return response()->json(['message' => 'Vidéo supprimée']);
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
            $this->sendResendEmail(
                $user->email,
                $user->username,
                $validated['subject'],
                $validated['message']
            );
        }

        return response()->json(['message' => 'Message envoyé avec succès']);
    }

    public function sendMessageAll(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
        ]);

        $users = User::whereNull('deleted_at')->get();
        $adminId = $request->user()->id;
        $sent = 0;
        $failed = 0;

        foreach ($users as $user) {
            DB::table('admin_messages')->insert([
                'admin_id' => $adminId,
                'user_id' => $user->id,
                'subject' => $validated['subject'],
                'message' => $validated['message'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $success = $this->sendResendEmail(
                $user->email,
                $user->username,
                $validated['subject'],
                $validated['message']
            );

            $success ? $sent++ : $failed++;
        }

        return response()->json([
            'message' => "Envoyé à {$sent} utilisateurs.",
            'sent' => $sent,
            'failed'  => $failed,
        ]);
    }

    private function sendResendEmail(string $email, string $username, string $subject, string $message): bool
    {
        $siteUrl = 'https://www.laughtube.ca';
        // Même gabarit que EmailService : valeurs échappées, thème « Fou rire ».
        $html = EmailService::adminMessageHtml(new EmailTemplate($siteUrl), $siteUrl, $username, $subject, $message);

        $response = Http::withHeaders([
            'Authorization' => 'Bearer ' . config('services.resend.key'),
            'Content-Type' => 'application/json',
        ])->post('https://api.resend.com/emails', [
            'from' => 'LaughTube <noreply@laughtube.ca>',
            'to' => [$email],
            'subject' => '[LaughTube] ' . $subject,
            'html' => $html,
            'reply_to' => 'legal@laughtube.ca',
        ]);

        return $response->successful();
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
