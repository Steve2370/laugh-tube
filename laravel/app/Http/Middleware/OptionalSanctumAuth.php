<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class OptionalSanctumAuth
{
    public function handle(Request $request, Closure $next)
    {
        try {
            auth('sanctum')->user();
        } catch (\Throwable) {
            $request->headers->remove('Authorization');
        }

        return $next($request);
    }
}
