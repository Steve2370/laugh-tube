<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DeviceTokenController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();
        $token = $request->input('device_token');
        $platform = $request->input('platform', 'ios');

        if (!$token) return response()->json(['error' => 'Token requis'], 400);

        DB::table('device_tokens')->updateOrInsert(
            ['device_token' => $token],
            ['user_id' => $user->id, 'platform' => $platform, 'updated_at' => now()]
        );

        return response()->json(['success' => true]);
    }
}
