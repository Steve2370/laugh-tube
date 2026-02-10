<?php
return [
    'host' => $_ENV['DB_HOST'] ?? 'postgres',
    'port' => (int)($_ENV['DB_PORT'] ?? 5432),
    'database' => $_ENV['DB_NAME'] ?? 'laughtube',
    'username' => $_ENV['DB_USER'] ?? 'laughtube_user',
    'password' => $_ENV['DB_PASSWORD'] ?? 'changeme',
    'charset' => 'UTF8',
];