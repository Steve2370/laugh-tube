<?php

namespace Tests\Feature\Security;

use Tests\TestCase;

/**
 * Couvre la faille 2.4 de l'audit du 12/09 : /api/v2/debug-ip était un
 * endpoint de diagnostic public renvoyant IP et en-têtes de forwarding sans
 * authentification. Supprimé entièrement de routes/api.php.
 */
class DebugIpRemovedTest extends TestCase
{
    public function test_debug_ip_route_no_longer_exists(): void
    {
        $this->getJson('/api/v2/debug-ip')->assertStatus(404);
    }
}
