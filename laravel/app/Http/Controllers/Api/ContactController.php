<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EmailService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Laravel\Sanctum\PersonalAccessToken;

class ContactController extends Controller
{
    public function __construct(private EmailService $emailService) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:255',
            'subject' => 'required|string|max:255',
            'message' => 'required|string|max:5000',
        ]);

        $authUser = $request->bearerToken()
            ? PersonalAccessToken::findToken($request->bearerToken())?->tokenable
            : null;

        DB::table('contact_messages')->insert([
            'user_id' => $authUser?->id,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'subject' => $validated['subject'],
            'message' => $validated['message'],
            'statut' => 'unread',
            'sent_at' => now(),
        ]);

        try {
            $this->emailService->sendContactNotificationEmail(
                $validated['name'],
                $validated['email'],
                $validated['subject'],
                $validated['message']
            );
        } catch (\Exception $e) {
            Log::error('Contact notification email failed: ' . $e->getMessage());
        }

        return response()->json(['success' => true, 'message' => 'Message envoyé']);
    }
}
