<?php

namespace App\Validators;

use App\Interfaces\ValidatorInterface;

class UsernameValidator implements ValidatorInterface {
    private ?string $error = null;

    private const RESERVED_USERNAMES = [
        'admin', 'administrator', 'root', 'system', 'moderator',
        'mod', 'support', 'help', 'null', 'undefined', 'api',
        'www', 'mail', 'ftp', 'localhost', 'test'
    ];

    public function validate(mixed $value): bool {
        if (!is_string($value)) {
            $this->error = "Le nom d'utilisateur doit être une chaîne de caractères";
            return false;
        }

        $username = trim($value);

        if (empty($username)) {
            $this->error = "Le nom d'utilisateur est requis";
            return false;
        }

        if (strlen($username) < 3) {
            $this->error = "Le nom d'utilisateur doit contenir au moins 3 caractères";
            return false;
        }

        if (strlen($username) > 50) {
            $this->error = "Le nom d'utilisateur est trop long (max 50 caractères)";
            return false;
        }

        if (!preg_match('/^[a-zA-Z0-9_-]+$/', $username)) {
            $this->error = "Le nom d'utilisateur ne peut contenir que des lettres, chiffres, tirets et underscores";
            return false;
        }

        if (preg_match('/^[0-9]/', $username)) {
            $this->error = "Le nom d'utilisateur ne peut pas commencer par un chiffre";
            return false;
        }

        if (preg_match('/[-_]{2,}/', $username)) {
            $this->error = "Le nom d'utilisateur ne peut pas contenir plusieurs tirets ou underscores consécutifs";
            return false;
        }

        if (in_array(strtolower($username), self::RESERVED_USERNAMES)) {
            $this->error = "Ce nom d'utilisateur est réservé";
            return false;
        }

        $this->error = null;
        return true;
    }

    public function getError(): ?string {
        return $this->error;
    }
}