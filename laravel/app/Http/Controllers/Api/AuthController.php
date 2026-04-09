<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => 'required|string|min:3|max:50|unique:users,username',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = User::create([
            'username' => $validated['username'],
            'email' => $validated['email'],
            'password_hash' => Hash::make($validated['password']),
            'email_verified' => false,
            'role' => 'membre',
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Compte créé avec succès',
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'username' => $user->username,
                'email' => $user->email,
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
        $token = $user->createToken('auth_token')->plainTextToken;

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

    public function handleGoogleCallback(): JsonResponse
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
            $user = User::where('email', $googleUser->getEmail())->first();

            if ($user) {
                $user->tokens()->delete();
                $token = $user->createToken('auth_token')->plainTextToken;

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

            $username = $this->generateUsername($googleUser->getName());

            $user = User::create([
                'username' => $username,
                'email' => $googleUser->getEmail(),
                'password_hash' => Hash::make(str()->random(32)),
                'avatar_url' => $googleUser->getAvatar(),
                'email_verified' => true,
                'role' => 'membre',
            ]);

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Compte créé avec succès',
                'token' => $token,
                'user' => [
                    'id' => $user->id,
                    'username' => $user->username,
                    'email' => $user->email,
                    'role' => $user->role,
                ],
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erreur Google : ' . $e->getMessage(),
            ], 500);
        }
    }

    private function generateUsername(string $name): string
    {
        $base = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $name));
        $base = $base ?: 'user';
        $username = $base;
        $counter  = 1;

        while (User::where('username', $username)->exists()) {
            $username = $base . $counter;
            $counter++;
        }

        return $username;
    }
}
