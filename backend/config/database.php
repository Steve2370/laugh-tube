<?php
// Faille 2.5 de l'audit du 12/09 : un DB_PASSWORD manquant faisait silencieusement
// démarrer le service avec le mot de passe par défaut 'changeme' (secret connu de
// tous). On échoue désormais au chargement plutôt que de se replier dessus.
return [
    'host' => $_ENV['DB_HOST'] ?? 'postgres',
    'port' => (int)($_ENV['DB_PORT'] ?? 5432),
    'database' => $_ENV['DB_NAME'] ?? 'laughtube',
    'username' => $_ENV['DB_USER'] ?? 'laughtube_user',
    'password' => $_ENV['DB_PASSWORD'] ?? throw new \RuntimeException(
        "DB_PASSWORD manquant dans l'environnement — arrêt volontaire (voir audit sécurité 2.5)."
    ),
    'charset' => 'UTF8',
];