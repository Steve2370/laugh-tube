<?php

namespace Tests\Feature\Jokair;

use App\Models\JokairContest;
use App\Models\JokairEntry;
use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Couvre le comportement demandé pour le concours Jok-Air : avant l'ouverture
 * des votes (score = 0 partout), le classement affiché en temps réel doit
 * suivre les vues réelles de la vidéo, pas l'ordre de soumission — une vidéo
 * à 15 vues doit apparaître au-dessus d'une vidéo à 8 vues, peu importe
 * laquelle a été soumise en premier. Vérifie aussi que ce tri secondaire ne
 * casse pas le principe 70/30 une fois les votes ouverts (le score prend le
 * dessus dès qu'il diffère).
 */
class LeaderboardTiebreakTest extends TestCase
{
    use RefreshDatabase;

    private function makeContest(string $status = 'submissions'): JokairContest
    {
        return JokairContest::create([
            'edition' => 'test-edition',
            'titre' => 'Concours de test',
            'submission_start' => now()->subDay(),
            'submission_end' => now()->addDay(),
            'vote_start' => now(),
            'vote_end' => now()->addDays(2),
            'status' => $status,
        ]);
    }

    private function makeEntry(JokairContest $contest, int $views, int $voteCount = 0, int $watchCount = 0): JokairEntry
    {
        $user = User::factory()->create();
        $video = Video::create([
            'user_id' => $user->id,
            'title' => "Vidéo {$views} vues",
            'views' => $views,
        ]);

        return JokairEntry::create([
            'contest_id' => $contest->id,
            'user_id' => $user->id,
            'video_id' => $video->id,
            'vote_count' => $voteCount,
            'watch_count' => $watchCount,
            'score' => 0,
            'validated' => true,
        ]);
    }

    public function test_before_voting_opens_the_video_with_more_real_views_ranks_first_regardless_of_submission_order(): void
    {
        $contest = $this->makeContest();

        // La vidéo à 8 vues est soumise EN PREMIER, celle à 15 vues ensuite —
        // avant le correctif, l'ordre d'insertion déterminait le classement.
        $eightViews = $this->makeEntry($contest, views: 8);
        $fifteenViews = $this->makeEntry($contest, views: 15);

        $response = $this->getJson("/api/v2/jokair/{$contest->id}/leaderboard");

        $response->assertStatus(200);
        $ids = collect($response->json())->pluck('id')->all();

        $this->assertSame([$fifteenViews->id, $eightViews->id], $ids);
    }

    public function test_once_scores_differ_the_70_30_score_takes_precedence_over_views(): void
    {
        $contest = $this->makeContest('voting');

        // Vues réelles inversées par rapport aux votes : si le tiebreak par vues
        // prenait le dessus sur le score, l'ordre serait cassé.
        $manyViewsFewVotes = $this->makeEntry($contest, views: 100, voteCount: 1);
        $fewViewsManyVotes = $this->makeEntry($contest, views: 5, voteCount: 10);

        $manyViewsFewVotes->recalculateScore();

        $this->assertGreaterThan($manyViewsFewVotes->fresh()->score, $fewViewsManyVotes->fresh()->score);

        $response = $this->getJson("/api/v2/jokair/{$contest->id}/leaderboard");
        $ids = collect($response->json())->pluck('id')->all();

        $this->assertSame([$fewViewsManyVotes->id, $manyViewsFewVotes->id], $ids);
    }
}
