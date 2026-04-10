<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileUploadController extends Controller
{
    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,jpg,png,webp|max:5120',
        ]);

        $user = $request->user();
        $file = $request->file('avatar');

        $filename = 'avatar_' . time() . '_' . substr(md5(uniqid()), 0, 16) . '.' . $file->getClientOriginalExtension();
        $destination = '/var/www/html/public/uploads/profiles';

        if (!is_dir($destination)) {
            mkdir($destination, 0775, true);
        }

        $file->move($destination, $filename);

        $user->update(['avatar_url' => $filename]);

        return response()->json([
            'message' => 'Avatar mis à jour',
            'avatar_url' => '/uploads/profiles/' . $filename,
        ]);
    }

    public function uploadCover(Request $request): JsonResponse
    {
        $request->validate([
            'cover' => 'required|image|mimes:jpeg,jpg,png,webp|max:10240',
        ]);

        $user = $request->user();
        $file = $request->file('cover');

        $filename = 'cover_' . time() . '_' . substr(md5(uniqid()), 0, 16) . '.' . $file->getClientOriginalExtension();
        $destination = '/var/www/html/public/uploads/profiles';

        if (!is_dir($destination)) {
            mkdir($destination, 0775, true);
        }

        $file->move($destination, $filename);

        $user->update(['cover_url' => $filename]);

        return response()->json([
            'message' => 'Cover mis à jour',
            'cover_url' => '/uploads/profiles/' . $filename,
        ]);
    }
}
