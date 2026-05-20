<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\EmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    public function __construct(private EmailService $emailService) {}
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'required|string|min:3|max:50|unique:users,username',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $verificationToken = Str::random(64);

        $user = User::create([
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password_hash' => Hash::make($validated['password']),
            'email_verified' => false,
            'verification_token' => $verificationToken,
            'verification_token_expires'  => now()->addDays(7),
            'role' => 'membre',
        ]);

        try {
            $this->emailService->sendVerificationEmail(
                $user->id,
                $user->email,
                $user->username,
                $verificationToken
            );
            $this->emailService->sendWelcomeEmail(
                $user->id,
                $user->email,
                $user->username
            );
        } catch (\Exception $e) {
            Log::error('Email failed on register: ' . $e->getMessage());
        }

        $token = $user->createToken('auth_token', ['*'], now()->addDays(30))->plainTextToken;

        return response()->json([
            'message' => 'Compte créé avec succès',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'email_verified' => false,
            ],
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password_hash)) {
            throw ValidationException::withMessages([
                'email' => ['Identifiants incorrects.'],
            ]);
        }

        if (!is_null($user->deleted_at)) {
            return response()->json(['error' => 'Compte désactivé.'], 403);
        }

        $user->tokens()->delete();
        $token = $user->createToken('auth_token', ['*'], now()->addDays(30))->plainTextToken;

        return response()->json([
            'message' => 'Connexion réussie',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }


    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Déconnexion réussie']);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        return response()->json([
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'avatar_url' => $user->avatar_url,
                'cover_url' => $user->cover_url,
                'bio' => $user->bio,
                'email_verified' => $user->email_verified,
                'created_at' => $user->created_at,
            ],
        ]);
    }

    public function redirectToGoogle(): JsonResponse
    {
        $url = Socialite::driver('google')
            ->stateless()
            ->redirect()
            ->getTargetUrl();

        return response()->json(['url' => $url]);
    }

    public function handleGoogleCallback(Request $request)
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
            $isNewUser = false;
            $user = User::withTrashed()->where('email', strtolower($googleUser->getEmail()))->first();

            if ($user) {
                if ($user->trashed()) $user->restore();
            } else {
                $isNewUser = true;
                $username = $this->generateUsername($googleUser->getName());
                $user = User::create([
                    'username' => $username,
                    'email' => strtolower($googleUser->getEmail()),
                    'password_hash' => Hash::make(Str::random(32)),
                    'avatar_url' => $googleUser->getAvatar(),
                    'email_verified' => true,
                    'role' => 'membre',
                ]);

                try {
                    $this->emailService->sendWelcomeEmail(
                        $user->id,
                        $user->email,
                        $user->username
                    );
                } catch (\Exception $e) {
                    Log::error('Welcome email failed (Google): ' . $e->getMessage());
                }
            }

            $user->tokens()->delete();
            $token = $user->createToken('auth_token', ['*'], now()->addDays(30))->plainTextToken;

            $state = $request->get('state', '');
            if (str_contains($state, 'ios') || str_contains($state, 'mobile') || $request->get('mobile') === '1') {
                return redirect('laughtube://auth/callback?token=' . $token . '&user_id=' . $user->id);
            }

            return redirect('https://www.laughtube.ca/#/auth/google/callback?token=' . $token . '&user_id=' . $user->id);
        } catch (\Exception $e) {
            return redirect('https://www.laughtube.ca/#/login?error=' . urlencode($e->getMessage()));
        }
    }

    private function generateUsername(string $name): string
    {
        $base = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $name));
        $base = $base ?: 'user';
        $username = $base;
        $counter = 1;

        while (User::where('username', $username)->exists()) {
            $username = $base . $counter++;
        }

        return $username;
    }

    public function verifyEmail(Request $request): JsonResponse
    {
        $token = $request->query('token');

        if (!$token) {
            return response()->json(['error' => 'Token manquant'], 400);
        }

        $user = User::where('verification_token', $token)
            ->where('verification_token_expires', '>', now())
            ->first();

        if (!$user) {
            return response()->json(['error' => 'Token invalide ou expiré'], 400);
        }

        $user->update([
            'email_verified' => true,
            'verification_token' => null,
            'verification_token_expires' => null,
        ]);

        return response()->json(['message' => 'Email vérifié avec succès']);
    }

    public function handleAppleCallback(Request $request): JsonResponse
    {
        try {
            $appleUser = Socialite::driver('apple')->stateless()->user();

            $user = User::withTrashed()->where('email', strtolower($appleUser->getEmail()))->first();

            if ($user) {
                if ($user->trashed()) $user->restore();
            } else {
                $username = $this->generateUsername($appleUser->getName() ?? $appleUser->getEmail());
                $user = User::create([
                    'username' => $username,
                    'email' => strtolower($appleUser->getEmail()),
                    'password_hash' => Hash::make(Str::random(32)),
                    'email_verified' => true,
                    'role' => 'membre',
                ]);

                try {
                    $this->emailService->sendWelcomeEmail(
                        $user->id,
                        $user->email,
                        $user->username
                    );
                } catch (\Exception $e) {
                    Log::error('Welcome email failed (Apple): ' . $e->getMessage());
                }
            }

            $user->tokens()->delete();
            $token = $user->createToken('auth_token', ['*'], now()->addDays(30))->plainTextToken;

            return response()->json([
                'token' => $token,
                'user_id' => $user->id,
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }

    public function handleAppleToken(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'identity_token' => 'required|string',
            'user_id' => 'required|string',
            'email' => 'nullable|email',
            'full_name' => 'nullable|string',
        ]);

        try {
            $tokenParts = explode('.', $validated['identity_token']);
            $payload = json_decode(base64_decode(str_pad(
                strtr($tokenParts[1], '-_', '+/'),
                strlen($tokenParts[1]) % 4,
                '='
            )), true);

            $appleUserId = $payload['sub'] ?? $validated['user_id'];
            $email = $payload['email'] ?? $validated['email'] ?? null;

            if (!$email) {
                return response()->json(['error' => 'Email requis'], 400);
            }

            $user = User::withTrashed()->where('email', strtolower($email))->first();

            if ($user) {
                if ($user->trashed()) $user->restore();
            } else {
                $username = $this->generateUsername($validated['full_name'] ?? $email);
                $user = User::create([
                    'username' => $username,
                    'email' => strtolower($email),
                    'password_hash' => Hash::make(Str::random(32)),
                    'email_verified' => true,
                    'role' => 'membre',
                ]);

                try {
                    $this->emailService->sendWelcomeEmail($user->id, $user->email, $user->username);
                } catch (\Exception $e) {
                    Log::error('Welcome email failed (Apple): ' . $e->getMessage());
                }
            }

            $user->tokens()->delete();
            $token = $user->createToken('auth_token', ['*'], now()->addDays(30))->plainTextToken;

            return response()->json([
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
            ]);

        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 400);
        }
    }
}
