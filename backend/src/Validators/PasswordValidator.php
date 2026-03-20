<?php

namespace App\Validators;

use App\Interfaces\ValidatorInterface;

class PasswordValidator implements ValidatorInterface {
    private ?string $error = null;
    private array $config;

    private const COMMON_PASSWORDS = [
        'password', '12345678', 'qwerty', 'abc123', 'monkey',
        'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou',
        'master', 'sunshine', 'ashley', 'bailey', 'passw0rd',
        'shadow', '123123', '654321', 'superman', 'qazwsx'
    ];

    public function __construct(array $config = []) {
        $this->config = array_merge([
            'min_length' => 8,
            'require_uppercase' => true,
            'require_lowercase' => true,
            'require_number' => true,
            'require_special' => false
        ], $config);
    }

    public function validate(mixed $value): bool {
        if (!is_string($value)) {
            $this->error = "Le mot de passe doit être une chaîne de caractères";
            return false;
        }

        if (empty($value)) {
            $this->error = "Le mot de passe est requis";
            return false;
        }

        $minLength = $this->config['min_length'];
        if (strlen($value) < $minLength) {
            $this->error = "Le mot de passe doit contenir au moins {$minLength} caractères";
            return false;
        }

        if ($this->config['require_uppercase'] && !preg_match('/[A-Z]/', $value)) {
            $this->error = "Le mot de passe doit contenir au moins une lettre majuscule";
            return false;
        }

        if ($this->config['require_lowercase'] && !preg_match('/[a-z]/', $value)) {
            $this->error = "Le mot de passe doit contenir au moins une lettre minuscule";
            return false;
        }

        if ($this->config['require_number'] && !preg_match('/[0-9]/', $value)) {
            $this->error = "Le mot de passe doit contenir au moins un chiffre";
            return false;
        }

        if ($this->config['require_special'] && !preg_match('/[^A-Za-z0-9]/', $value)) {
            $this->error = "Le mot de passe doit contenir au moins un caractère spécial";
            return false;
        }

        $lowercasePassword = strtolower($value);
        foreach (self::COMMON_PASSWORDS as $commonPassword) {
            if ($lowercasePassword === $commonPassword) {
                $this->error = "Ce mot de passe est trop commun, choisissez-en un plus sécurisé";
                return false;
            }
        }

        if (strlen($value) > 128) {
            $this->error = "Le mot de passe est trop long (max 128 caractères)";
            return false;
        }

        $this->error = null;
        return true;
    }

    public function getError(): ?string {
        return $this->error;
    }
}