<?php
require_once __DIR__ . '/../vendor/autoload.php';

use App\Middleware\AuthMiddleware;
use App\Providers\PostgreSQLDatabase;
use App\Repositories\SessionRepository;
use App\Repositories\UserRepository;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

try {
    $dbConfig = require __DIR__ . '/../config/database.php';

    $db = new PostgreSQLDatabase($dbConfig);
    $db->connect();

    $userRepo = new UserRepository($db);
    $sessionRepo = new SessionRepository($db);

    $authMiddleware = new AuthMiddleware($sessionRepo);
    $user = $authMiddleware->handle();

    if (!$user) exit;

    $userRecord = $userRepo->findById($user['user_id']);

    if (!$userRecord) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Utilisateur non trouvé']);
        exit;
    }

    unset($userRecord['password_hash']);
    unset($userRecord['two_fa_secret']);
    unset($userRecord['verification_token']);

    echo json_encode(['success' => true, 'user' => $userRecord]);

} catch (\Exception $e) {
    error_log("Me error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erreur serveur']);
}