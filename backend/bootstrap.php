<?php

if (file_exists(__DIR__ . '/vendor/autoload.php')) {
    require_once __DIR__ . '/vendor/autoload.php';
} elseif (file_exists(__DIR__ . '/api/autoload.php')) {
    require_once __DIR__ . '/api/autoload.php';
} else {
    die('Autoloader not found');
}

$envPath = __DIR__ . '/.env';
if (file_exists($envPath)) {
    $dotenv = parse_ini_file($envPath);
    foreach ($dotenv as $key => $value) {
        $_ENV[$key] = $value;
        putenv("$key=$value");
    }
}

date_default_timezone_set('UTC');
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);