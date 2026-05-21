<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorController extends Controller
{
    private Google2FA $google2fa;

    public function __construct()
    {
        $this->google2fa = new Google2FA();
    }

    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'success' => true,
            'enabled' => (bool) $user->two_fa_enabled,
            'configured' => !empty($user->two_fa_secret),
            'backup_codes_left' => 0,
        ]);
    }

    public function enable(Request $request): JsonResponse
    {
        $user = $request->user();

        $secret = $this->google2fa->generateSecretKey();

        $user->update(['two_fa_secret' => $secret]);

        $otpauthUrl = $this->google2fa->getQRCodeUrl(
            'LaughTube',
            $user->email,
            $secret
        );

        $qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data='
            . urlencode($otpauthUrl);

        $backupCodes = [];
        for ($i = 0; $i < 10; $i++) {
            $backupCodes[] = strtoupper(bin2hex(random_bytes(4)));
        }

        return response()->json([
            'secret' => $secret,
            'qr_code' => $qrCodeUrl,
            'backup_codes' => $backupCodes,
            'message' => 'Scannez le QR code avec votre application d\'authentification',
        ]);
    }

    public function verify(Request $request): JsonResponse
    {
        $request->validate(['code' => 'required|string|size:6']);

        $user = $request->user();

        if (empty($user->two_fa_secret)) {
            return response()->json(['error' => '2FA non initialisée'], 400);
        }

        $valid = $this->google2fa->verifyKey($user->two_fa_secret, $request->code);

        if (!$valid) {
            return response()->json(['error' => 'Code invalide'], 400);
        }

        $user->update(['two_fa_enabled' => true]);

        return response()->json(['message' => 'Authentification 2FA activée avec succès']);
    }

    public function disable(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($request->has('password') && !empty($request->password)) {
            if (!Hash::check($request->password, $user->password_hash)) {
                return response()->json(['error' => 'Mot de passe incorrect'], 400);
            }
        }

        $user->update([
            'two_fa_enabled' => false,
            'two_fa_secret' => null,
        ]);

        return response()->json(['success' => true, 'message' => '2FA désactivé']);
    }
}
