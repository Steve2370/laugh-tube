<?php

return [
    'host' => $_ENV['DB_HOST'] ?? 'zephyrus_database',
    'port' => (int)($_ENV['DB_PORT'] ?? 5432),
    'database' => $_ENV['DB_NAME'] ?? 'laugh_tale',
    'username' => $_ENV['DB_USER'] ?? 'laugh',
    'password' => $_ENV['DB_PASSWORD'] ?? 'laugh',
    'charset' => 'UTF8'
];