<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JokairContest;
use App\Models\JokairEntry;
use App\Models\JokairVote;
use App\Models\JokairWatch;
use App\Models\Video;
use Illuminate\Http\Request;

class JokairController extends Controller
{
    public function activeContest()
    {
        $contest = JokairContest::whereIn('status', ['submissions', 'voting'])
            ->latest()
            ->firstOrFail();

        return response()->json($contest);
    }

    public function submitEntry(Request $request, JokairContest $contest)
    {
        abort_unless($contest->isSubmissionOpen(), 403, 'Soumissions fermées');

        $request->validate(['video_id' => 'required|exists:videos,id']);
        $video = Video::where('id', $request->video_id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        $entry = JokairEntry::create([
            'contest_id' => $contest->id,
            'user_id' => auth()->id(),
            'video_id' => $video->id,
        ]);

        return response()->json($entry, 201);
    }

    public function vote(JokairEntry $entry)
    {
        $contest = $entry->contest;
        abort_unless($contest->isVotingOpen(), 403, 'Vote fermé');
        abort_if($entry->user_id === auth()->id(), 403, 'Tu ne peux pas voter pour toi-même');

        $user = auth()->user();
        abort_if($user->created_at->diffInMinutes(now()) < 30, 429, 'Compte trop récent');

        JokairVote::create([
            'entry_id' => $entry->id,
            'voter_id' => $user->id,
        ]);

        $entry->increment('vote_count');
        $entry->recalculateScore();

        return response()->json(['voted' => true, 'total' => $entry->vote_count]);
    }

    public function recordWatch(Request $request, JokairEntry $entry)
    {
        $request->validate([
            'seconds_watched' => 'required|integer|min:1',
            'video_duration'  => 'required|integer|min:1',
        ]);

        $userId = auth()->id();

        $alreadyWatched = JokairWatch::where('entry_id', $entry->id)
            ->where('user_id', $userId)
            ->exists();

        if (!$alreadyWatched) {
            JokairWatch::create([
                'entry_id' => $entry->id,
                'user_id' => $userId,
                'seconds_watched'=> $request->seconds_watched,
                'video_duration' => $request->video_duration,
            ]);

            $entry->increment('watch_count');
            $entry->increment('watch_seconds_total', $request->seconds_watched);
            $entry->recalculateScore();
        }

        return response()->json(['recorded' => true]);
    }

    public function leaderboard(JokairContest $contest)
    {
        $entries = $contest->entries()
            ->with(['user:id,username,avatar', 'video:id,titre,thumbnail'])
            ->orderByDesc('score')
            ->take(10)
            ->get()
            ->map(function ($entry, $index) {
                return [
                    'rank' => $index + 1,
                    'user' => $entry->user,
                    'video' => $entry->video,
                    'vote_count' => $entry->vote_count,
                    'score' => $entry->score,
                ];
            });

        return response()->json($entries);
    }

    public function computeRanks(JokairContest $contest)
    {
        $entries = $contest->entries()->orderByDesc('score')->get();
        foreach ($entries as $i => $entry) {
            $entry->update(['rank' => $i + 1]);
        }

        $contest->update(['status' => 'ended']);
        return response()->json(['computed' => true, 'total' => $entries->count()]);
    }
}
