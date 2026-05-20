<?php

namespace App\Repositories;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class LogRepository
{
    public function logEmail(array $data): ?int
    {
        try {
            return DB::table('email_logs')->insertGetId([
                'user_id' => $data['user_id'] ?? null,
                'email_type' => $data['email_type'] ?? null,
                'recipient' => $data['recipient'] ?? null,
                'subject' => $data['subject'] ?? null,
                'body' => $data['body'] ?? null,
                'status' => $data['status'] ?? 'pending',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::warning('logEmail failed: ' . $e->getMessage());
            return null;
        }
    }

    public function updateEmailStatus(int $id, string $status, ?string $error = null): void
    {
        try {
            DB::table('email_logs')->where('id', $id)->update([
                'status' => $status,
                'error' => $error,
                'updated_at' => now(),
            ]);
        } catch (\Exception $e) {
            Log::warning('updateEmailStatus failed: ' . $e->getMessage());
        }
    }
}
