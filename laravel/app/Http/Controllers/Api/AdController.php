<?php
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdController extends Controller
{
    public function random()
    {
        $ad = DB::table('ads')
            ->where('is_active', true)
            ->inRandomOrder()
            ->first();

        if (!$ad) return response()->json(['ad' => null]);

        DB::table('ads')->where('id', $ad->id)->increment('impressions');

        return response()->json(['ad' => $ad]);
    }

    public function click(int $id)
    {
        DB::table('ads')->where('id', $id)->increment('clicks');
        return response()->json(['success' => true]);
    }

    public function index()
    {
        $ads = DB::table('ads')->orderBy('created_at', 'desc')->get();
        return response()->json(['ads' => $ads]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string',
            'video_url' => 'required|string',
            'redirect_url' => 'required|string',
            'advertiser_name' => 'nullable|string',
            'skip_after_seconds' => 'nullable|integer|min:0|max:30',
        ]);

        $id = DB::table('ads')->insertGetId([
            'title' => $request->title,
            'video_url' => $request->video_url,
            'redirect_url' => $request->redirect_url,
            'advertiser_name' => $request->advertiser_name ?? 'LaughTube',
            'skip_after_seconds' => $request->skip_after_seconds ?? 5,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(['ad' => DB::table('ads')->find($id)], 201);
    }

    public function toggle(int $id)
    {
        $ad = DB::table('ads')->find($id);
        if (!$ad) return response()->json(['error' => 'Introuvable'], 404);
        DB::table('ads')->where('id', $id)->update(['is_active' => !$ad->is_active]);
        return response()->json(['success' => true]);
    }

    public function destroy(int $id)
    {
        DB::table('ads')->where('id', $id)->delete();
        return response()->json(['success' => true]);
    }
}
