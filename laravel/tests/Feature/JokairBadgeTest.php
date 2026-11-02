<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Video;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Badge Jok-Air sur les vidéos :
 * - « JOK-AIR » (is_jokair) seulement pendant un concours ouvert (soumissions ou votes)
 * - plus rien une fois le concours terminé, sauf pour le 1er
 * - « CHAMPION » (jokair_champion = édition) pour le rank 1 d'un concours terminé
 * - jokair_entry_id fourni pendant le concours, pour l'enregistrement des visionnements
 */
class JokairBadgeTest extends TestCase
{
    use RefreshDatabase;

    private int $edition = 2026;

    private function makeContest(string $status): int
    {
        return DB::table('jokair_contests')->insertGetId([
            'edition'          => (string) $this->edition++,
            'titre'            => "Jok-Air test {$status}",
            'submission_start' => now()->subDays(30),
            'submission_end'   => now()->subDays(15),
            'vote_start'       => now()->subDays(15),
            'vote_end'         => now()->subDay(),
            'status'           => $status,
            'created_at'       => now(),
            'updated_at'       => now(),
        ]);
    }

    private function makeVideo(?User $user = null): Video
    {
        $user ??= User::factory()->create();

        return Video::create([
            'user_id' => $user->id,
            'title'   => 'Ma vidéo drôle',
            'status'  => 'published',
        ]);
    }

    private function enter(Video $video, int $contestId, bool $validated = true, ?int $rank = null): int
    {
        return DB::table('jokair_entries')->insertGetId([
            'contest_id' => $contestId,
            'user_id'    => $video->user_id,
            'video_id'   => $video->id,
            'validated'  => $validated,
            'rank'       => $rank,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function test_video_without_entry_has_no_badge(): void
    {
        $video = $this->makeVideo();

        $this->assertSame(
            ['is_jokair' => false, 'jokair_entry_id' => null, 'jokair_champion' => null],
            $video->jokairBadge()
        );
    }

    public function test_badge_shown_during_submissions_and_voting(): void
    {
        foreach (['submissions', 'voting'] as $status) {
            $video = $this->makeVideo();
            $entryId = $this->enter($video, $this->makeContest($status));

            $badge = $video->jokairBadge();
            $this->assertTrue($badge['is_jokair'], "Badge attendu pendant « {$status} »");
            $this->assertSame($entryId, $badge['jokair_entry_id']);
            $this->assertNull($badge['jokair_champion']);
        }
    }

    public function test_badge_hidden_for_unvalidated_entry(): void
    {
        $video = $this->makeVideo();
        $this->enter($video, $this->makeContest('voting'), validated: false);

        $this->assertFalse($video->jokairBadge()['is_jokair']);
    }

    public function test_badge_hidden_before_contest_opens(): void
    {
        $video = $this->makeVideo();
        $this->enter($video, $this->makeContest('upcoming'));

        $this->assertFalse($video->jokairBadge()['is_jokair']);
    }

    public function test_badge_removed_after_contest_ends_for_non_winners(): void
    {
        $contestId = $this->makeContest('ended');
        foreach ([2, 3, null] as $rank) {
            $video = $this->makeVideo();
            $this->enter($video, $contestId, rank: $rank);

            $this->assertSame(
                ['is_jokair' => false, 'jokair_entry_id' => null, 'jokair_champion' => null],
                $video->jokairBadge(),
                'Aucun badge attendu pour rank ' . var_export($rank, true)
            );
        }
    }

    public function test_winner_keeps_permanent_champion_badge(): void
    {
        $video = $this->makeVideo();
        $contestId = $this->makeContest('ended');
        $edition = DB::table('jokair_contests')->where('id', $contestId)->value('edition');
        $this->enter($video, $contestId, rank: 1);

        $badge = $video->jokairBadge();
        $this->assertFalse($badge['is_jokair']);
        $this->assertNull($badge['jokair_entry_id']);
        $this->assertSame($edition, $badge['jokair_champion']);
    }

    public function test_past_champion_resubmitted_to_open_contest_gets_both(): void
    {
        $video = $this->makeVideo();
        $this->enter($video, $this->makeContest('ended'), rank: 1);
        $openEntry = $this->enter($video, $this->makeContest('submissions'));

        $badge = $video->jokairBadge();
        $this->assertTrue($badge['is_jokair']);
        $this->assertSame($openEntry, $badge['jokair_entry_id']);
        $this->assertNotNull($badge['jokair_champion']);
    }

    public function test_api_exposes_badge_fields_on_user_videos(): void
    {
        $user = User::factory()->create();
        $winner = $this->makeVideo($user);
        $loser = $this->makeVideo($user);
        $ended = $this->makeContest('ended');
        $this->enter($winner, $ended, rank: 1);
        $this->enter($loser, $ended, rank: 2);

        $videos = collect($this->getJson("/api/v2/users/{$user->id}/videos")
            ->assertOk()
            ->json('videos'))->keyBy('id');

        $this->assertFalse($videos[$winner->id]['is_jokair']);
        $this->assertNotNull($videos[$winner->id]['jokair_champion']);
        $this->assertFalse($videos[$loser->id]['is_jokair']);
        $this->assertNull($videos[$loser->id]['jokair_champion']);
    }
}
