<?php

namespace App\Helpers;

use Illuminate\Support\Facades\DB;

class BlockHelper
{
    public static function blockedUserIds(int $userId): array
    {
        $blocked = DB::table('blocks')
            ->where('blocker_id', $userId)
            ->pluck('blocked_id');

        $blockers = DB::table('blocks')
            ->where('blocked_id', $userId)
            ->pluck('blocker_id');

        return $blocked->merge($blockers)->unique()->toArray();
    }
}
