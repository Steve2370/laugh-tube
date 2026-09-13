<?php

namespace Tests\Feature\Security;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

/**
 * Couvre la faille 1.4 de l'audit du 12/09 : bootstrap/app.php renvoyait
 * $e->getMessage() et class_basename($e) pour TOUTES les erreurs API, même en
 * production (APP_DEBUG=false), risquant de divulguer chemins, SQL, noms de
 * services internes. Vérifie aussi la régression détectée en écrivant ce test :
 * ValidationException et AuthenticationException n'implémentent pas
 * getStatusCode(), donc un premier correctif naïf les masquait à tort
 * derrière un faux "erreur interne" (500) au lieu de leur 422/401 normal.
 */
class ExceptionHandlingTest extends TestCase
{
    use RefreshDatabase;

    public function test_unexpected_server_error_is_masked_in_production(): void
    {
        config(['app.debug' => false]);

        Route::get('/api/__test-only-boom', function () {
            throw new \RuntimeException('détail interne sensible : DSN=pgsql://...');
        });

        $response = $this->getJson('/api/__test-only-boom');

        $response->assertStatus(500)->assertJsonStructure(['error', 'reference']);
        $this->assertStringNotContainsString('détail interne sensible', $response->getContent());
        $this->assertStringNotContainsString('RuntimeException', $response->getContent());
    }

    public function test_unauthenticated_request_returns_401_not_a_generic_500(): void
    {
        // AuthenticationException (Sanctum) n'implémente pas getStatusCode() :
        // sans l'exclusion explicite dans bootstrap/app.php, ce cas retombait
        // sur le statut par défaut 500 du callback.
        config(['app.debug' => false]);

        $response = $this->getJson('/api/v2/me');

        $response->assertStatus(401);
        $this->assertStringNotContainsString('erreur interne', strtolower($response->getContent()));
    }

    public function test_validation_errors_keep_their_standard_structure_in_production(): void
    {
        // ValidationException n'implémente pas non plus getStatusCode() : même
        // risque de masquage à tort en 500 générique.
        config(['app.debug' => false]);

        $response = $this->postJson('/api/v2/register', []);

        $response->assertStatus(422)->assertJsonStructure(['errors']);
    }
}
