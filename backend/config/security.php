<?php

return [
    'password' => [
        'min_length' => 8,
        'require_uppercase' => true,
        'require_lowercase' => true,
        'require_number' => true,
        'require_special' => false
    ],

    'rate_limit' => [
        'max_login_attempts' => 5,
        'lockout_minutes' => 15,
        'max_api_requests_per_minute' => 60
    ],

    'session' => [
        'lifetime_hours' => 24,
        'refresh_threshold_hours' => 12
    ],

    'tokens' => [
        'email_verification_hours' => 24,
        'password_reset_hours' => 1,
        '2fa_backup_codes_count' => 10
    ]
];