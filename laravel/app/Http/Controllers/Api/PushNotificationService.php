<?php

namespace App\Http\Controllers\Api;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    private string $keyId;
    private string $teamId;
    private string $bundleId;
    private string $privateKey;
    private bool $production;

    public function __construct()
    {
        $this->keyId = env('APNS_KEY_ID', '');
        $this->teamId = env('APNS_TEAM_ID', '');
        $this->bundleId = env('APNS_BUNDLE_ID', 'ca.laughtube.ios');
        $this->production = env('APNS_PRODUCTION', false);

        $keyPath = '/var/www/laravel/apns_key.p8';
        $this->privateKey = file_exists($keyPath) ? file_get_contents($keyPath) : '';
    }

    public function sendToUser(int $userId, string $title, string $body, array $data = []): void
    {
        $tokens = DB::table('device_tokens')
            ->where('user_id', $userId)
            ->where('platform', 'ios')
            ->pluck('device_token');

        foreach ($tokens as $token) {
            $this->send($token, $userId, $title, $body, $data);
        }
    }

    private function send(string $deviceToken, int $userId, string $title, string $body, array $data = []): void
    {
        if (empty($this->keyId) || empty($this->teamId) || empty($this->privateKey)) {
            Log::warning('APNs not configured');
            return;
        }

        $host = $this->production
            ? 'https://api.push.apple.com'
            : 'https://api.sandbox.push.apple.com';

        $url = "$host/3/device/$deviceToken";

        $unreadCount = DB::table('notifications')
            ->where('user_id', $userId)
            ->where('is_read', false)
            ->count();

        $payload = json_encode([
            'aps' => [
                'alert' => ['title' => $title, 'body' => $body],
                'sound' => 'Funny.wav',
                'badge' => $unreadCount,
            ],
            'data' => $data,
        ]);

        $jwt = $this->generateJWT();

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_2,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                "authorization: bearer $jwt",
                "apns-topic: {$this->bundleId}",
                "apns-push-type: alert",
                "content-type: application/json",
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            Log::error("APNs error $httpCode: $response");
            if ($httpCode === 410) {
                DB::table('device_tokens')->where('device_token', $deviceToken)->delete();
            }
        }
    }

    private function generateJWT(): string
    {
        $header  = $this->base64url(json_encode(['alg' => 'ES256', 'kid' => $this->keyId]));
        $payload = $this->base64url(json_encode(['iss' => $this->teamId, 'iat' => time()]));
        $signing = "$header.$payload";
        $privateKey = openssl_pkey_get_private($this->privateKey);
        openssl_sign($signing, $signature, $privateKey, OPENSSL_ALGO_SHA256);
        return "$signing." . $this->base64url($signature);
    }

    private function base64url(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
