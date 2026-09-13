<?php

use App\Http\Middleware\OptionalSanctumAuth;
use App\Http\Middleware\VerifyCsrfToken;
use App\Http\Middleware\EnsureIsAdmin;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Faille 2.4 de l'audit du 12/09 : trustProxies('*') faisait confiance à
        // n'importe quelle IP se prétendant proxy, ce qui permet de forger les en-têtes
        // X-Forwarded-For / IP côté client. En prod, seul nginx (sur le réseau Docker
        // interne) est un vrai proxy — on ne fait donc confiance qu'aux plages privées.
        $middleware->trustProxies(at: [
            '10.0.0.0/8',
            '172.16.0.0/12',
            '192.168.0.0/16',
        ]);
        $middleware->validateCsrfTokens(except: [
            'api/*',
        ]);
        $middleware->api(prepend: [
            EnsureFrontendRequestsAreStateful::class,
            OptionalSanctumAuth::class,
        ]);

        $middleware->alias([
            'auth.sanctum' => CheckAbilities::class,
            'admin' => EnsureIsAdmin::class,
        ]);
        $middleware->redirectGuestsTo(fn() => null);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->render(function (\Throwable $e, $request) {
            if (!($request->is('api/*') || $request->wantsJson())) {
                return null;
            }

            // Ni ValidationException ni AuthenticationException n'implémentent
            // getStatusCode() : les laisser passer permet au gestionnaire natif de
            // Laravel de produire leur format standard (422 + "errors" détaillées
            // pour la validation, 401 pour Sanctum) au lieu que ce callback les
            // force à 500 par défaut, ce qui masquerait à tort des erreurs 4xx
            // normales derrière "Une erreur interne est survenue".
            if ($e instanceof \Illuminate\Validation\ValidationException
                || $e instanceof \Illuminate\Auth\AuthenticationException) {
                return null;
            }

            $status = $e instanceof \Symfony\Component\HttpKernel\Exception\HttpExceptionInterface
                ? $e->getStatusCode()
                : (method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500);

            // Faille 1.4 de l'audit du 12/09 : toutes les erreurs (y compris les
            // erreurs serveur inattendues) renvoyaient le message brut de l'exception
            // et son nom de classe, même en prod (chemins, SQL, détails internes).
            // Les erreurs 4xx restent affichées telles quelles : ce sont des messages
            // métier volontaires (ex. "Identifiants incorrects.", "Tu as déjà voté...")
            // dont le frontend a besoin. Seules les erreurs 5xx (bugs/imprévus) sont
            // masquées en production, avec une référence pour retrouver le détail
            // dans les logs.
            if ($status >= 500 && !config('app.debug')) {
                $reference = (string) Str::uuid();
                Log::error("[{$reference}] " . $e->getMessage(), ['exception' => $e]);

                return response()->json([
                    'error' => 'Une erreur interne est survenue.',
                    'reference' => $reference,
                ], $status);
            }

            return response()->json(array_filter([
                'error' => $e->getMessage(),
                'type'  => config('app.debug') ? class_basename($e) : null,
            ], fn ($v) => $v !== null), $status);
        });
    })->create();
