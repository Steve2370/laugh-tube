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
        $messageHtml = nl2br(htmlspecialchars($message));
        $siteUrl = 'https://www.laughtube.ca';
        $logoUrl = $siteUrl . '/logo.png';
        $logo = '<img src="' . $logoUrl . '" alt="LaughTube" width="200" style="display:block;margin:0 auto;max-width:200px;height:auto;">';

        $html = <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f0f0f0;margin:0;padding:0;}
  .wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);}
  .header{background:#ffffff;padding:24px;text-align:center;}
  .badge{display:inline-block;background:#fff;color:#111;font-size:11px;font-weight:bold;padding:4px 12px;border-radius:20px;margin-top:12px;letter-spacing:1px;text-transform:uppercase;}
  .content{padding:32px;}
  .subject{font-size:20px;font-weight:bold;color:#111;margin-bottom:16px;padding-bottom:16px;border-bottom:2px solid #f0f0f0;}
  .message-box{background:#f9f9f9;border-left:4px solid #111;padding:20px;border-radius:0 8px 8px 0;margin:20px 0;font-size:15px;line-height:1.7;}
  .reply-box{background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin-top:24px;font-size:13px;}
  .footer{text-align:center;padding:16px;font-size:12px;color:#999;background:#f5f5f5;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    {$logo}
    <div class="badge">Message de l'administration</div>
  </div>
  <div class="content">
    <p>Bonjour <strong>{$username}</strong>,</p>
    <p>L'équipe d'administration de LaughTube vous a envoyé le message suivant :</p>
    <div class="subject">{$subject}</div>
    <div class="message-box">{$messageHtml}</div>
    <div class="reply-box">
      <strong>Contacter le support :</strong><br>
      Écrivez-nous à <a href="{$siteUrl}/#/contact" style="color:#111;font-weight:bold;">laughtube.ca/contact</a>
    </div>
  </div>
  <div class="footer">© 2026 LaughTube. Tous droits réservés. · <a href="{$siteUrl}" style="color:#999;">laughtube.ca</a></div>
</div>
</body></html>
HTML;

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
