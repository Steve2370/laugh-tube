<?php

use App\Http\Controllers\Api\VideoController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes — LaughTube
|--------------------------------------------------------------------------
*/

Route::prefix('v2')->group(function () {

    Route::get('/ping', fn() => response()->json(['status' => 'ok', 'version' => 'laravel']));

    Route::get('/videos', [VideoController::class, 'index']);
    Route::get('/videos/trending', [VideoController::class, 'trending']);
    Route::get('/videos/popular', [VideoController::class, 'popular']);
    Route::get('/videos/recent', [VideoController::class, 'recent']);
    Route::get('/videos/{id}', [VideoController::class, 'show']);

});
