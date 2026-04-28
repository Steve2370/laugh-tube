<?php

namespace App\Http\Controllers\Api;

use App\Helpers\NotificationHelper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Agence104\LiveKit\AccessToken;
use Agence104\LiveKit\AccessTokenOptions;
use Agence104\LiveKit\VideoGrant;

class BattleController extends Controller
{
    private string $apiKey;
    private string $apiSecret;

    public function __construct()
    {
        $this->apiKey    = env('LIVEKIT_API_KEY');
        $this->apiSecret = env('LIVEKIT_API_SECRET');
    }

    public function challenge(Request $request, int $challengedId): JsonResponse
    {
        $challenger = $request->user();

        if ($challenger->id === $challengedId) {
            return response()->json(['error' => 'Vous ne pouvez pas vous défier vous-même'], 400);
        }

        $challenged = DB::table('users')->where('id', $challengedId)->whereNull('deleted_at')->first();
        if (!$challenged) {
            return response()->json(['error' => 'Utilisateur introuvable'], 404);
        }

        $existing = DB::table('battles')
            ->where(function ($q) use ($challenger, $challengedId) {
                $q->where('challenger_id', $challenger->id)->where('challenged_id', $challengedId);
            })
            ->orWhere(function ($q) use ($challenger, $challengedId) {
                $q->where('challenger_id', $challengedId)->where('challenged_id', $challenger->id);
            })
            ->whereIn('status', ['pending', 'accepted', 'scheduled', 'live'])
            ->first();

        if ($existing) {
            return response()->json(['error' => 'Une battle est déjà en cours avec cet utilisateur'], 400);
        }

        $battleId = DB::table('battles')->insertGetId([
            'challenger_id' => $challenger->id,
            'challenged_id' => $challengedId,
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('notifications')->insert([
            'user_id' => $challengedId,
            'actor_id' => $challenger->id,
            'actor_name' => $challenger->username,
            'type' => 'battle_challenge',
            'message' => $challenger->username . ' te provoque en duel dans la Battle Room !',
            'is_read' => false,
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Défi envoyé !',
            'battle_id' => $battleId,
        ]);
    }

    public function respond(Request $request, int $battleId): JsonResponse
    {
        $request->validate(['action' => 'required|in:accept,refuse']);

        $user = $request->user();
        $battle = DB::table('battles')->where('id', $battleId)->where('challenged_id', $user->id)->where('status', 'pending')->first();

        if (!$battle) {
            return response()->json(['error' => 'Défi introuvable'], 404);
        }

        if ($request->action === 'refuse') {
            DB::table('battles')->where('id', $battleId)->update(['status' => 'refused', 'updated_at' => now()]);
            return response()->json(['message' => 'Défi refusé']);
        }

        DB::table('battles')->where('id', $battleId)->update(['status' => 'accepted', 'updated_at' => now()]);

        DB::table('notifications')->insert([
            'user_id' => $battle->challenger_id,
            'actor_id' => $user->id,
            'actor_name' => $user->username,
            'type' => 'battle_accepted',
            'message' => $user->username . ' a accepté ton défi !',
            'is_read' => false,
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Défi accepté !', 'battle_id' => $battleId]);
    }

    public function schedule(Request $request, int $battleId): JsonResponse
    {
        $request->validate(['scheduled_at' => 'required|string']);
        $scheduledAt = date('Y-m-d H:i:s', strtotime($request->scheduled_at));

        $user = $request->user();
        $battle = DB::table('battles')->where('id', $battleId)
            ->where(function ($q) use ($user) {
                $q->where('challenger_id', $user->id)->orWhere('challenged_id', $user->id);
            })
            ->where('status', 'accepted')
            ->first();

        if (!$battle) {
            return response()->json(['error' => 'Battle introuvable'], 404);
        }

        DB::table('battles')->where('id', $battleId)->update([
            'scheduledAt' => $request->scheduledAt,
            'status' => 'scheduled',
            'updated_at' => now(),
        ]);

        $otherId = $user->id === $battle->challenger_id ? $battle->challenged_id : $battle->challenger_id;
        DB::table('notifications')->insert([
            'user_id' => $otherId,
            'actor_id' => $user->id,
            'actor_name' => $user->username,
            'type' => 'battle_scheduled',
            'message' => 'La battle a été programmée pour le ' . date('d/m/Y à H:i', strtotime($request->scheduledAt)),
            'is_read' => false,
            'created_at' => now(),
        ]);

        $challenger = DB::table('users')->where('id', $battle->challenger_id)->first();
        $challenged = DB::table('users')->where('id', $battle->challenged_id)->first();

        $abonnes = DB::table('abonnements')
            ->whereIn('subscribed_to_id', [$battle->challenger_id, $battle->challenged_id])
            ->pluck('subscriber_id')
            ->unique();

        foreach ($abonnes as $abonneId) {
            if ($abonneId === $battle->challenger_id || $abonneId === $battle->challenged_id) continue;
            DB::table('notifications')->insert([
                'user_id' => $abonneId,
                'actor_id' => $user->id,
                'actor_name' => $user->username,
                'type' => 'battle_scheduled',
                'message' => " {$challenger->username} vs {$challenged->username} — Battle programmée !",
                'is_read' => false,
                'created_at' => now(),
            ]);
        }

        return response()->json(['message' => 'Battle programmée !']);
    }

    public function index(): JsonResponse
    {
        $battles = DB::table('battles')
            ->join('users as c', 'battles.challenger_id', '=', 'c.id')
            ->join('users as d', 'battles.challenged_id', '=', 'd.id')
            ->whereIn('battles.status', ['scheduled', 'live'])
            ->select(
                'battles.id',
                'battles.status',
                'battles.scheduledAt',
                'battles.challenger_score',
                'battles.challenged_score',
                'battles.challenger_id',
                'battles.challenged_id',
                'c.username as challenger_username',
                'c.avatar_url as challenger_avatar',
                'd.username as challenged_username',
                'd.avatar_url as challenged_avatar',
            )
            ->orderBy('battles.scheduledAt', 'asc')
            ->get();

        return response()->json(['battles' => $battles]);
    }

    public function myBattles(Request $request): JsonResponse
    {
        $user = $request->user();

        $battles = DB::table('battles')
            ->join('users as c', 'battles.challenger_id', '=', 'c.id')
            ->join('users as d', 'battles.challenged_id', '=', 'd.id')
            ->where('battles.challenger_id', $user->id)
            ->orWhere('battles.challenged_id', $user->id)
            ->select(
                'battles.id',
                'battles.status',
                'battles.scheduledAt',
                'battles.challenger_id',
                'battles.challenged_id',
                'battles.challenger_score',
                'battles.challenged_score',
                'battles.winner_id',
                'c.username as challenger_username',
                'c.avatar_url as challenger_avatar',
                'd.username as challenged_username',
                'd.avatar_url as challenged_avatar',
            )
            ->orderBy('battles.created_at', 'desc')
            ->get();

        return response()->json(['battles' => $battles]);
    }


    /**
     * @throws \Exception
     */
    public function start(Request $request, int $battleId): JsonResponse
    {
        $user = $request->user();
        $battle = DB::table('battles')->where('id', $battleId)
            ->where('challenger_id', $user->id)
            ->whereIn('status', ['scheduled', 'accepted'])
            ->first();

        if (!$battle) {
            return response()->json(['error' => 'Battle introuvable'], 404);
        }

        $roomName = 'battle-' . $battleId . '-' . time();

        DB::table('battles')->where('id', $battleId)->update([
            'status' => 'live',
            'room_name' => $roomName,
            'started_at' => now(),
            'updated_at' => now(),
        ]);

        $token = $this->generateToken($roomName, $user->id, $user->username, true);

        return response()->json(['token' => $token, 'room_name' => $roomName]);
    }


    /**
     * @throws \Exception
     */
    public function join(Request $request, int $battleId): JsonResponse
    {
        $user = $request->user();
        $battle = DB::table('battles')->where('id', $battleId)->whereIn('status', ['live', 'scheduled'])->first();

        if (!$battle) {
            return response()->json(['error' => 'Battle introuvable'], 404);
        }

        $isParticipant = $user->id === $battle->challenger_id || $user->id === $battle->challenged_id;
        $token = $this->generateToken($battle->room_name, $user->id, $user->username, $isParticipant);

        return response()->json(['token' => $token, 'room_name' => $battle->room_name]);
    }

    public function vote(Request $request, int $battleId): JsonResponse
    {
        $request->validate([
            'target_id' => 'required|integer',
            'emoji' => 'required|string',
        ]);

        $user = $request->user();
        $battle = DB::table('battles')->where('id', $battleId)->where('status', 'live')->first();

        if (!$battle) {
            return response()->json(['error' => 'Battle introuvable ou non en cours'], 404);
        }

        $points = match($request->emoji) {
            '🔥' => 3,
            '😂' => 2,
            '👑' => 5,
            default => 1,
        };

        DB::table('battle_votes')->updateOrInsert(
            ['battle_id' => $battleId, 'user_id' => $user->id],
            ['target_id' => $request->target_id, 'emoji' => $request->emoji, 'points' => $points, 'created_at' => now()]
        );

        $challengerScore = DB::table('battle_votes')->where('battle_id', $battleId)->where('target_id', $battle->challenger_id)->sum('points');
        $challengedScore = DB::table('battle_votes')->where('battle_id', $battleId)->where('target_id', $battle->challenged_id)->sum('points');

        DB::table('battles')->where('id', $battleId)->update([
            'challenger_score' => $challengerScore,
            'challenged_score' => $challengedScore,
            'updated_at' => now(),
        ]);

        return response()->json([
            'challenger_score' => $challengerScore,
            'challenged_score' => $challengedScore,
        ]);
    }

    public function stop(Request $request, int $battleId): JsonResponse
    {
        $user = $request->user();
        $battle = DB::table('battles')->where('id', $battleId)->where('challenger_id', $user->id)->where('status', 'live')->first();

        if (!$battle) {
            return response()->json(['error' => 'Battle introuvable'], 404);
        }

        $winnerId = $battle->challenger_score >= $battle->challenged_score
            ? $battle->challenger_id
            : $battle->challenged_id;

        DB::table('battles')->where('id', $battleId)->update([
            'status' => 'ended',
            'winner_id' => $winnerId,
            'ended_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json([
            'message' => 'Battle terminée',
            'winner_id' => $winnerId,
        ]);
    }

    /**
     * @throws \Exception
     */
    private function generateToken(string $roomName, mixed $userId, string $username, bool $isPublisher): string
    {
        $tokenOptions = (new AccessTokenOptions())
            ->setIdentity((string) $userId)
            ->setName($username);

        $videoGrants = (new VideoGrant())
            ->setRoomJoin(true)
            ->setRoomName($roomName)
            ->setCanPublish($isPublisher)
            ->setCanPublishData(true)
            ->setCanSubscribe(true);

        return (new AccessToken($this->apiKey, $this->apiSecret))
            ->init($tokenOptions)
            ->setGrant($videoGrants)
            ->toJwt();
    }
}
