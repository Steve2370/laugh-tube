<?php

require_once __DIR__ . '/vendor/autoload.php';

$dotenv = parse_ini_file(__DIR__ . '/.env');
foreach ($dotenv as $key => $value) {
    $_ENV[$key] = $value;
    putenv("$key=$value");
}

date_default_timezone_set('UTC');
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);