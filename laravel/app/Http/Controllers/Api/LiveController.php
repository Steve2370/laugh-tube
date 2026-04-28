<?php

namespace App\Http\Controllers\Api;

use Agence104\LiveKit\VideoGrant;
use App\Helpers\NotificationHelper;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Agence104\LiveKit\RoomServiceClient;
use Agence104\LiveKit\AccessToken;
use Agence104\LiveKit\AccessTokenOptions;

class LiveController extends Controller
{
    private string $apiKey;
    private string $apiSecret;
    private string $host;

    public function __construct()
    {
        $this->apiKey = env('LIVEKIT_API_KEY');
        $this->apiSecret = env('LIVEKIT_API_SECRET');
        $this->host = 'http://' . env('LIVEKIT_HOST', 'livekit:7880');
    }

    public function start(Request $request): JsonResponse
    {
        $user = $request->user();
        $roomName = 'standup-' . $user->id . '-' . time();

        $liveId = DB::table('lives')->insertGetId([
            'user_id' => $user->id,
            'room_name' => $roomName,
            'status' => 'live',
            'started_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $token = $this->generateToken($roomName, $user->id, $user->username, true);

        $abonnes = DB::table('abonnements')
            ->where('subscribed_to_id', $user->id)
            ->pluck('subscriber_id');

        foreach ($abonnes as $abonneId) {
            DB::table('notifications')->insert([
                'user_id' => $abonneId,
                'actor_id' => $user->id,
                'actor_name' => $user->username,
                'type' => 'live',
                'message' => $user->username . ' est en live !',
                'is_read' => false,
                'created_at' => now(),
            ]);
        }

        return response()->json([
            'live_id' => $liveId,
            'room_name' => $roomName,
            'token' => $token,
        ]);
    }

    public function join(Request $request, int $liveId): JsonResponse
    {
        $user = $request->user();

        $live = DB::table('lives')->where('id', $liveId)->where('status', 'live')->first();
        if (!$live) {
            return response()->json(['error' => 'Live introuvable ou terminé'], 404);
        }

        $token = $this->generateToken($live->room_name, $user->id, $user->username, false);

        return response()->json([
            'room_name' => $live->room_name,
            'token' => $token,
            'host' => 'wss://laughtube.ca/livekit',
        ]);
    }

    public function stop(Request $request, int $liveId): JsonResponse
    {
        $user = $request->user();

        $live = DB::table('lives')->where('id', $liveId)->where('user_id', $user->id)->first();
        if (!$live) {
            return response()->json(['error' => 'Live introuvable'], 404);
        }

        DB::table('lives')->where('id', $liveId)->update([
            'status' => 'ended',
            'ended_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['message' => 'Live terminé']);
    }

    public function index(): JsonResponse
    {
        $lives = DB::table('lives')
            ->join('users', 'lives.user_id', '=', 'users.id')
            ->where('lives.status', 'live')
            ->select(
                'lives.id',
                'lives.room_name',
                'lives.started_at',
                'users.id as user_id',
                'users.username',
                'users.avatar_url',
            )
            ->orderBy('lives.started_at', 'desc')
            ->get();

        return response()->json(['lives' => $lives]);
    }

    public function joinPublic(Request $request, int $liveId): JsonResponse
    {
        $live = DB::table('lives')->where('id', $liveId)->where('status', 'live')->first();
        if (!$live) {
            return response()->json(['error' => 'Live introuvable ou terminé'], 404);
        }

        $guestName = 'Spectateur' . rand(1000, 9999);
        $token = $this->generateToken($live->room_name, 'guest-' . rand(), $guestName, false);

        return response()->json([
            'room_name' => $live->room_name,
            'token' => $token,
            'host' => 'wss://laughtube.ca/livekit',
        ]);
    }

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

        $token = (new AccessToken($this->apiKey, $this->apiSecret))
            ->init($tokenOptions)
            ->setGrant($videoGrants)
            ->toJwt();

        return $token;
    }
}
