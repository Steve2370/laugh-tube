<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\LikeController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\VideoController;
use Illuminate\Support\Facades\Route;

Route::prefix('v2')->group(function () {

    Route::get('/ping', fn() => response()->json(['status' => 'ok', 'version' => 'laravel']));

    Route::get('/videos', [VideoController::class, 'index']);
    Route::get('/videos/trending', [VideoController::class, 'trending']);
    Route::get('/videos/popular', [VideoController::class, 'popular']);
    Route::get('/videos/recent', [VideoController::class, 'recent']);
    Route::get('/videos/{id}', [VideoController::class, 'show']);
    Route::get('/videos/{id}/reactions', [LikeController::class, 'reactions']);
    Route::get('/videos/{id}/comments', [CommentController::class, 'index']);

    Route::get('/users/{id}/profile', [ProfileController::class, 'show']);
    Route::get('/users/{id}/videos', [ProfileController::class, 'videos']);

    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/auth/google', [AuthController::class, 'redirectToGoogle']);
    Route::get('/auth/google/callback', [AuthController::class, 'handleGoogleCallback']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);

        Route::put('/profile', [ProfileController::class, 'update']);
        Route::put('/profile/password', [ProfileController::class, 'updatePassword']);

        Route::delete('/videos/{id}', [VideoController::class, 'destroy']);
        Route::post('/videos/{id}/like', [LikeController::class, 'like']);
        Route::post('/videos/{id}/dislike', [LikeController::class, 'dislike']);
        Route::post('/videos/{id}/comments', [CommentController::class, 'store']);
        Route::delete('/videos/{id}/comments/{commentId}', [CommentController::class, 'destroy']);
    });

});
