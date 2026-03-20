<?php

namespace App\Validators;

use App\Interfaces\ValidatorInterface;

class EmailValidator implements ValidatorInterface {
    private ?string $error = null;

    public function validate(mixed $value): bool {
        if (!is_string($value)) {
            $this->error = "L'email doit être une chaîne de caractères";
            return false;
        }

        $email = trim($value);

        if (empty($email)) {
            $this->error = "L'email est requis";
            return false;
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error = "Format d'email invalide";
            return false;
        }

        if (strlen($email) > 100) {
            $this->error = "L'email est trop long (max 100 caractères)";
            return false;
        }

        if (preg_match('/[<>"\']/', $email)) {
            $this->error = "L'email contient des caractères non autorisés";
            return false;
        }

        $domain = substr(strrchr($email, "@"), 1);
        if ($domain && !checkdnsrr($domain, "MX") && !checkdnsrr($domain, "A")) {
            $this->error = "Le domaine de l'email n'existe pas";
            return false;
        }

        $this->error = null;
        return true;
    }

    public function getError(): ?string {
        return $this->error;
    }
}