<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureIsAdmin
{
    public function handle(Request $request, Closure $next)
    {
        if (!$request->user() || $request->user()->role !== 'admin') {
            return response()->json(['error' => 'Accès réservé aux administrateurs'], 403);
        }
        return $next($request);
    }
}

