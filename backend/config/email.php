<?php

// SECURITE (2026-09-03) : ce fichier était auparavant commité avec des secrets en dur
// (clé Resend vide qui cassait silencieusement l'envoi d'email, + un identifiant et un
// mot de passe d'application Gmail en clair). Ces valeurs viennent maintenant de .env.
// Le mot de passe Gmail qui était ici doit être considéré comme compromis : il a été
// commité dans l'historique Git et doit être révoqué/régénéré dans les paramètres du
// compte Google concerné, indépendamment de ce correctif (voir rapport de migration).
return [
    'resend_api_key' => ($_ENV['RESEND_API_KEY'] ?? getenv('RESEND_API_KEY')) ?: '',
    'from_email' => 'noreply@laughtube.ca',
    'from_name' => 'Laugh Tube',
    'base_url' => ($_ENV['APP_URL'] ?? getenv('APP_URL')) ?: 'https://www.laughtube.ca',
    'smtp_username' => ($_ENV['SMTP_USERNAME'] ?? getenv('SMTP_USERNAME')) ?: '',
    'smtp_password' => ($_ENV['SMTP_PASSWORD'] ?? getenv('SMTP_PASSWORD')) ?: '',
    'smtp_host' => ($_ENV['SMTP_HOST'] ?? getenv('SMTP_HOST')) ?: 'smtp.gmail.com',
    'smtp_port' => (int) (($_ENV['SMTP_PORT'] ?? getenv('SMTP_PORT')) ?: 465),
];
