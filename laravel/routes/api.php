<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CommentController;
use App\Http\Controllers\Api\CommentInteractionController;
use App\Http\Controllers\Api\LikeController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ProfileUploadController;
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
        Route::post('/videos/{id}/signaler', [VideoController::class, 'signaler']);
        Route::post('/users/{id}/signaler', [VideoController::class, 'signalerUser']);

        Route::put('/profile', [ProfileController::class, 'update']);
        Route::put('/profile/password', [ProfileController::class, 'updatePassword']);
        Route::post('/users/me/avatar', [ProfileUploadController::class, 'uploadAvatar']);
        Route::post('/users/me/cover',  [ProfileUploadController::class, 'uploadCover']);

        Route::delete('/videos/{id}', [VideoController::class, 'destroy']);
        Route::post('/videos/{id}/like', [LikeController::class, 'like']);
        Route::post('/videos/{id}/dislike', [LikeController::class, 'dislike']);
        Route::post('/videos/{id}/comments', [CommentController::class, 'store']);
        Route::delete('/videos/{id}/comments/{commentId}', [CommentController::class, 'destroy']);
        Route::post('/videos/upload', [VideoController::class, 'upload']);

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::patch('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::patch('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);
        Route::delete('/notifications/delete-read', [NotificationController::class, 'deleteAllRead']);

        Route::post('/comments/{commentId}/like', [CommentInteractionController::class, 'toggleCommentLike']);
        Route::get('/comments/{commentId}/like-status', [CommentInteractionController::class, 'getCommentLikeStatus']);
        Route::get('/comments/{commentId}/replies', [CommentInteractionController::class, 'getReplies']);
        Route::post('/comments/{commentId}/replies', [CommentInteractionController::class, 'postReply']);
        Route::post('/replies/{replyId}/like', [CommentInteractionController::class, 'toggleReplyLike']);
        Route::get('/replies/{replyId}/like-status', [CommentInteractionController::class, 'getReplyLikeStatus']);

    });

    Route::middleware(['auth:sanctum'])->prefix('admin')->group(function () {
        Route::get('/stats', [AdminController::class, 'getStats']);

        Route::get('/users', [AdminController::class, 'getUsers']);
        Route::delete('/users/{id}', [AdminController::class, 'deleteUser']);
        Route::patch('/users/{id}/suspend', [AdminController::class, 'suspendUser']);
        Route::patch('/users/{id}/unsuspend', [AdminController::class, 'unsuspendUser']);
        Route::patch('/users/{id}/restore', [AdminController::class, 'restoreUser']);
        Route::post('/users/{id}/signaler', [VideoController::class, 'signalerUser']);
        Route::get('/videos', [AdminController::class, 'getVideos']);
        Route::delete('/videos/{id}', [AdminController::class, 'deleteVideo']);

        Route::get('/signalements', [AdminController::class, 'getSignalements']);
        Route::patch('/signalements/{id}', [AdminController::class, 'updateSignalement']);

        Route::get('/contact', [AdminController::class, 'getContact']);
        Route::patch('/contact/{id}', [AdminController::class, 'updateContact']);

        Route::get('/messages', [AdminController::class, 'getMessages']);
        Route::post('/messages', [AdminController::class, 'sendMessage']);
        Route::post('/admin/messages/all', [AdminController::class, 'sendMessageAll']);
    });

});
