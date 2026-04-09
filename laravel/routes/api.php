<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — LaughTube
|--------------------------------------------------------------------------
| Migration progressive : on ajoute les routes ici au fur et à mesure
| que chaque endpoint est migré depuis le backend PHP custom.
|--------------------------------------------------------------------------
*/

Route::prefix('v2')->group(function () {

    // ── Health check ──────────────────────────────────────────────
    Route::get('/ping', fn() => response()->json(['status' => 'ok', 'version' => 'laravel']));

    // ── Routes publiques vidéos (Phase 2) ─────────────────────────
    // À décommenter quand chaque route sera prête :
    //
    // Route::get('/videos',           [VideoController::class, 'index']);
    // Route::get('/videos/trending',  [VideoController::class, 'trending']);
    // Route::get('/videos/popular',   [VideoController::class, 'popular']);
    // Route::get('/videos/recent',    [VideoController::class, 'recent']);
    // Route::get('/videos/{id}',      [VideoController::class, 'show']);

    // ── Auth (Phase 3) ────────────────────────────────────────────
    //
    // Route::post('/register', [AuthController::class, 'register']);
    // Route::post('/login',    [AuthController::class, 'login']);
    //
    // Route::middleware('auth:sanctum')->group(function () {
    //     Route::post('/logout', [AuthController::class, 'logout']);
    // });

});
