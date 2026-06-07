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

    public function leaderboard(JokairContest $contest)
    {
        $entries = $contest->entries()
            ->where('validated', true)
            ->with(['user:id,username,avatar_url', 'video:id,titre,thumbnail,views'])
            ->orderByDesc('score')
            ->take(10)
            ->get()
            ->map(function ($entry, $index) {
                return [
                    'id' => $entry->id,
                    'rank' => $index + 1,
                    'user' => $entry->user,
                    'video' => $entry->video,
                    'vote_count' => $entry->vote_count,
                    'watch_count'=> $entry->watch_count,
                    'score' => $entry->score,
                ];
            });

        return response()->json($entries);
    }

    public function hallOfFame()
    {
        $editions = JokairContest::where('status', 'ended')
            ->with(['entries' => function ($q) {
                $q->where('rank', 1)->with('user:id,username,avatar_url');
            }])
            ->orderByDesc('edition')
            ->get()
            ->map(function ($contest) {
                $winner = $contest->entries->first()?->user;
                return [
                    'year' => $contest->edition,
                    'titre' => $contest->titre,
                    'winner' => $winner?->username,
                    'avatar' => $winner?->avatar_url,
                ];
            });

        return response()->json($editions);
    }


    public function submitEntry(Request $request, JokairContest $contest)
    {
        abort_unless($contest->isSubmissionOpen(), 403, 'Soumissions fermées');

        $request->validate(['video_id' => 'required|exists:videos,id']);

        $video = Video::where('id', $request->video_id)
            ->where('user_id', auth()->id())
            ->firstOrFail();

        abort_if(
            JokairEntry::where('contest_id', $contest->id)
                ->where('user_id', auth()->id())
                ->exists(),
            409,
            'Tu as déjà soumis une vidéo pour ce concours'
        );

        $entry = JokairEntry::create([
            'contest_id' => $contest->id,
            'user_id' => auth()->id(),
            'video_id' => $video->id,
            'validated' => false,
        ]);

        return response()->json($entry, 201);
    }

    public function vote(JokairEntry $entry)
    {
        $contest = $entry->contest;
        abort_unless($contest->isVotingOpen(), 403, 'Vote fermé');
        abort_unless($entry->validated, 403, 'Cette vidéo n\'est pas validée');
        abort_if($entry->user_id === auth()->id(), 403, 'Tu ne peux pas voter pour toi-même');

        $user = auth()->user();
        abort_if($user->created_at->diffInMinutes(now()) < 30, 429, 'Compte trop récent');

        abort_if(
            JokairVote::where('entry_id', $entry->id)
                ->where('voter_id', $user->id)
                ->exists(),
            409,
            'Tu as déjà voté pour cette vidéo'
        );

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
            'video_duration' => 'required|integer|min:1',
        ]);

        $userId = auth()->id();

        $alreadyWatched = JokairWatch::where('entry_id', $entry->id)
            ->where('user_id', $userId)
            ->exists();

        if (!$alreadyWatched) {
            JokairWatch::create([
                'entry_id' => $entry->id,
                'user_id' => $userId,
                'seconds_watched' => $request->seconds_watched,
                'video_duration' => $request->video_duration,
            ]);

            $entry->increment('watch_count');
            $entry->increment('watch_seconds_total', $request->seconds_watched);
            $entry->recalculateScore();
        }

        return response()->json(['recorded' => true]);
    }

    public function myStatus(JokairContest $contest)
    {
        $entry = JokairEntry::where('contest_id', $contest->id)
            ->where('user_id', auth()->id())
            ->with('video:id,titre,thumbnail')
            ->first();

        return response()->json([
            'has_entry' => (bool) $entry,
            'entry' => $entry,
        ]);
    }


    public function createContest(Request $request)
    {
        $data = $request->validate([
            'edition' => 'required|string|unique:jokair_contests,edition',
            'titre' => 'required|string',
            'submission_start' => 'required|date',
            'submission_end' => 'required|date|after:submission_start',
            'vote_start' => 'required|date|after_or_equal:submission_end',
            'vote_end' => 'required|date|after:vote_start',
            'results_date' => 'nullable|date|after_or_equal:vote_end',
            'status' => 'required|in:upcoming,submissions,voting,ended',
            'prize_1' => 'required|integer|min:0',
            'prize_2' => 'required|integer|min:0',
            'prize_3' => 'required|integer|min:0',
        ]);

        $contest = JokairContest::create($data);
        return response()->json($contest, 201);
    }

    public function updateStatus(Request $request, JokairContest $contest)
    {
        $data = $request->validate([
            'edition' => 'sometimes|string',
            'titre' => 'sometimes|string',
            'submission_start' => 'sometimes|date',
            'submission_end' => 'sometimes|date',
            'vote_start' => 'sometimes|date',
            'vote_end' => 'sometimes|date',
            'results_date' => 'nullable|date',
            'status' => 'sometimes|in:upcoming,submissions,voting,ended',
            'prize_1' => 'sometimes|integer|min:0',
            'prize_2' => 'sometimes|integer|min:0',
            'prize_3' => 'sometimes|integer|min:0',
        ]);

        $contest->update($data);
        return response()->json($contest);
    }

    public function adminEntries(JokairContest $contest)
    {
        $entries = $contest->entries()
            ->with(['user:id,username,avatar_url', 'video:id,titre,thumbnail,views'])
            ->orderByDesc('created_at')
            ->get()
            ->map(function ($entry) {
                return [
                    'id' => $entry->id,
                    'validated' => $entry->validated,
                    'rejected_reason' => $entry->rejected_reason,
                    'vote_count' => $entry->vote_count,
                    'watch_count' => $entry->video->views ?? 0,
                    'score' => $entry->score,
                    'created_at' => $entry->created_at,
                    'user' => $entry->user,
                    'video' => $entry->video,
                ];
            });

        return response()->json($entries);
    }

    public function validateEntry(Request $request, JokairEntry $entry)
    {
        $data = $request->validate([
            'validated' => 'required|boolean',
            'rejected_reason' => 'nullable|string|max:500',
        ]);

        $entry->update([
            'validated' => $data['validated'],
            'rejected_reason' => $data['validated'] ? null : ($data['rejected_reason'] ?? null),
        ]);

        return response()->json([
            'id' => $entry->id,
            'validated' => $entry->validated,
        ]);
    }

    public function deleteEntry(JokairEntry $entry)
    {
        $entry->votes()->delete();
        $entry->watches()->delete();
        $entry->delete();

        return response()->json(['deleted' => true]);
    }

    public function computeRanks(JokairContest $contest)
    {
        $entries = $contest->entries()
            ->where('validated', true)
            ->orderByDesc('score')
            ->get();

        foreach ($entries as $i => $entry) {
            $entry->update(['rank' => $i + 1]);
        }

        $contest->update(['status' => 'ended']);

        return response()->json(['computed' => true, 'total' => $entries->count()]);
    }
}
