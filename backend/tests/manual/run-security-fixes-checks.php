<?php

/**
 * Vérifications manuelles pour les correctifs de l'audit du 12/09 qui vivent
 * dans le backend PHP legacy (backend/), lequel n'a aucun framework de tests
 * (pas de PHPUnit dans backend/composer.json). Plutôt que d'ajouter toute une
 * infrastructure PHPUnit pour 3 correctifs, ce script autonome (aucune
 * dépendance, aucune base de données requise) vérifie directement le
 * comportement corrigé. À exécuter avec :
 *
 *   php backend/tests/manual/run-security-fixes-checks.php
 *
 * Sortie : une ligne PASS/FAIL par vérification, code de sortie 0 si tout
 * passe, 1 sinon.
 */

$root = dirname(__DIR__, 2); // backend/
$failures = 0;
$total = 0;

function check(string $label, callable $fn, int &$total, int &$failures): void
{
    $total++;
    try {
        $fn();
        echo "PASS  {$label}\n";
    } catch (\Throwable $e) {
        $failures++;
        echo "FAIL  {$label}\n      -> " . $e->getMessage() . "\n";
    }
}

// ---------------------------------------------------------------------------
// Faille 2.5 : backend/config/database.php retombait sur le mot de passe
// connu 'changeme' quand DB_PASSWORD était absent. Doit maintenant lever une
// RuntimeException volontaire.
// ---------------------------------------------------------------------------
check('2.5 - config/database.php lève une exception si DB_PASSWORD est absent', function () use ($root) {
    unset($_ENV['DB_PASSWORD']);
    putenv('DB_PASSWORD');

    $threw = false;
    try {
        require $root . '/config/database.php';
    } catch (\RuntimeException $e) {
        $threw = true;
    }

    if (!$threw) {
        throw new \Exception('Aucune exception levée : le fallback "changeme" est peut-être encore présent.');
    }
}, $total, $failures);

check('2.5 - config/database.php fonctionne normalement quand DB_PASSWORD est défini', function () use ($root) {
    $_ENV['DB_PASSWORD'] = 'un-mot-de-passe-de-test';
    putenv('DB_PASSWORD=un-mot-de-passe-de-test');

    $config = require $root . '/config/database.php';

    if (($config['password'] ?? null) !== 'un-mot-de-passe-de-test') {
        throw new \Exception('Le mot de passe fourni via l\'environnement n\'a pas été repris tel quel.');
    }
    if (($config['password'] ?? null) === 'changeme') {
        throw new \Exception('Le fallback "changeme" est encore actif.');
    }
}, $total, $failures);

// ---------------------------------------------------------------------------
// Faille 2.3 : RateLimitMiddleware désactivait silencieusement le rate
// limiting quand APCu était absent. Vérifie directement le repli fichier
// (checkFileFallback), sans dépendre de la présence ou non d'APCu sur cette
// machine.
// ---------------------------------------------------------------------------
check('2.3 - le repli fichier du rate limiting bloque après le maximum autorisé', function () use ($root) {
    require_once $root . '/src/Middleware/RateLimitMiddleware.php';

    $dir = sys_get_temp_dir() . '/laughtube_ratelimit';
    $key = 'rl_test_check_' . uniqid();
    @unlink($dir . '/' . $key . '.json');

    $method = new \ReflectionMethod(\App\Middleware\RateLimitMiddleware::class, 'checkFileFallback');
    $method->setAccessible(true);

    $now = time();
    $max = 3;
    $window = 60;

    // Les $max premiers appels doivent passer sans lever de sortie (exit).
    // On exécute ce test dans un sous-processus pour pouvoir observer le
    // exit()/http_response_code(429) du (max+1)-ième appel sans tuer ce script.
    $php = PHP_BINARY;
    $script = <<<PHP
        require '{$root}/src/Middleware/RateLimitMiddleware.php';
        \$method = new ReflectionMethod(App\Middleware\RateLimitMiddleware::class, 'checkFileFallback');
        \$method->setAccessible(true);
        for (\$i = 0; \$i < {$max}; \$i++) {
            \$method->invoke(null, '{$key}', 'test', {$window}, {$max}, {$now});
        }
        echo "UNDER_LIMIT_OK\\n";
        \$method->invoke(null, '{$key}', 'test', {$window}, {$max}, {$now});
        echo "SHOULD_NOT_REACH_HERE\\n";
        PHP;

    $tmpScript = tempnam(sys_get_temp_dir(), 'ratelimit_check_') . '.php';
    file_put_contents($tmpScript, "<?php\n" . $script);
    $output = shell_exec("{$php} {$tmpScript} 2>&1");
    @unlink($tmpScript);
    @unlink($dir . '/' . $key . '.json');

    if (!str_contains($output, 'UNDER_LIMIT_OK')) {
        throw new \Exception("Les {$max} premières requêtes auraient dû passer. Sortie : " . $output);
    }
    if (str_contains($output, 'SHOULD_NOT_REACH_HERE')) {
        throw new \Exception('La requête au-delà du maximum aurait dû être bloquée (exit via tooManyRequests).');
    }
}, $total, $failures);

// ---------------------------------------------------------------------------
// Faille 2.2 (chemin réellement utilisé) : AuthService::deleteAccount()
// n'avait que 2 paramètres déclarés alors que le contrôleur en passait 3 par
// position, donc $password (2e argument réel) était affecté à $reason (2e
// paramètre déclaré) et stocké tel quel dans deletion_reason en base — sans
// jamais être vérifié. Vérifie par réflexion que la signature déclare
// maintenant bien (userId, password, reason) dans cet ordre.
// ---------------------------------------------------------------------------
check('2.2 - AuthService::deleteAccount() déclare (userId, password, reason) dans le bon ordre', function () use ($root) {
    require_once $root . '/src/Services/AuthService.php';

    $method = new \ReflectionMethod(\App\Services\AuthService::class, 'deleteAccount');
    $params = array_map(fn ($p) => $p->getName(), $method->getParameters());

    if ($params !== ['userId', 'password', 'reason']) {
        throw new \Exception('Signature inattendue : (' . implode(', ', $params) . '). '
            . 'Le contrôleur appelle deleteAccount($userId, $password, $reason) par position : '
            . 'si cet ordre change ici sans changer le contrôleur, le mot de passe se '
            . 'retrouve de nouveau stocké en clair dans deletion_reason.');
    }
}, $total, $failures);

check('2.2 - UserRepository::findByIdWithPassword() existe (nécessaire pour vérifier le mot de passe)', function () use ($root) {
    require_once $root . '/src/Repositories/UserRepository.php';

    if (!method_exists(\App\Repositories\UserRepository::class, 'findByIdWithPassword')) {
        throw new \Exception('Méthode absente : AuthService::deleteAccount() n\'a aucun moyen de récupérer le hash du mot de passe.');
    }
}, $total, $failures);

echo "\n{$total} vérifications, " . ($total - $failures) . " succès, {$failures} échec(s).\n";
exit($failures > 0 ? 1 : 0);
