<?php

namespace App\Services;

use App\Validators\EmailValidator;
use App\Validators\PasswordValidator;
use App\Validators\UsernameValidator;

class ValidationService
{
    private EmailValidator $emailValidator;
    private PasswordValidator $passwordValidator;
    private UsernameValidator $usernameValidator;

    public function __construct(array $passwordConfig = [])
    {
        $this->emailValidator = new EmailValidator();
        $this->passwordValidator = new PasswordValidator($passwordConfig);
        $this->usernameValidator = new UsernameValidator();
    }

    public function validateRegistrationData(string $username, string $email, string $password): array
    {
        $errors = [];

        $usernameErrors = $this->validateUsernameWithErrors($username);
        if (!empty($usernameErrors)) {
            $errors = array_merge($errors, $usernameErrors);
        }

        $emailErrors = $this->validateEmailWithErrors($email);
        if (!empty($emailErrors)) {
            $errors = array_merge($errors, $emailErrors);
        }

        $passwordErrors = $this->validatePasswordWithErrors($password);
        if (!empty($passwordErrors)) {
            $errors = array_merge($errors, $passwordErrors);
        }

        return $errors;
    }

    public function validateLoginData(string $email, string $password): array
    {
        $errors = [];

        if (empty(trim($email))) {
            $errors['email'] = "L'email ou le nom d'utilisateur est requis";
        } elseif (filter_var($email, FILTER_VALIDATE_EMAIL) === false && strlen(trim($email)) < 3) {
            $errors['email'] = "Email ou nom d'utilisateur invalide";
        }

        if (empty($password)) {
            $errors['password'] = "Le mot de passe est requis";
        } elseif (strlen($password) < 6) {
            $errors['password'] = "Mot de passe trop court (minimum 6 caractères)";
        }

        return $errors;
    }

    public function validateRegistration(array $data): ?array
    {
        $errors = [];

        if (!isset($data['email']) || empty($data['email'])) {
            $errors['email'] = "L'email est requis";
        } elseif (!$this->emailValidator->validate($data['email'])) {
            $errors['email'] = $this->emailValidator->getError();
        }

        if (!isset($data['password']) || empty($data['password'])) {
            $errors['password'] = "Le mot de passe est requis";
        } elseif (!$this->passwordValidator->validate($data['password'])) {
            $errors['password'] = $this->passwordValidator->getError();
        }

        if (!isset($data['username']) || empty($data['username'])) {
            $errors['username'] = "Le nom d'utilisateur est requis";
        } elseif (!$this->usernameValidator->validate($data['username'])) {
            $errors['username'] = $this->usernameValidator->getError();
        }

        return empty($errors) ? null : $errors;
    }

    public function validateEmail(string $email): bool
    {
        return $this->emailValidator->validate($email);
    }

    public function validateEmailWithErrors(string $email): array
    {
        $errors = [];

        if (empty(trim($email))) {
            $errors['email'] = "L'email est requis";
        } elseif (!$this->validateEmail($email)) {
            $errors['email'] = $this->getEmailError() ?? "Email invalide";
        }

        return $errors;
    }

    public function validatePassword(string $password): bool
    {
        return $this->passwordValidator->validate($password);
    }

    public function validatePasswordWithErrors(string $password): array
    {
        $errors = [];

        if (empty($password)) {
            $errors['password'] = "Le mot de passe est requis";
        } elseif (!$this->validatePassword($password)) {
            $errors['password'] = $this->getPasswordError() ?? "Mot de passe invalide";
        }

        return $errors;
    }

    public function validateUsername(string $username): bool
    {
        return $this->usernameValidator->validate($username);
    }

    public function validateUsernameWithErrors(string $username): array
    {
        $errors = [];

        if (empty(trim($username))) {
            $errors['username'] = "Le nom d'utilisateur est requis";
        } elseif (!$this->validateUsername($username)) {
            $errors['username'] = $this->getUsernameError() ?? "Nom d'utilisateur invalide";
        }

        return $errors;
    }

    public function getEmailError(): ?string
    {
        return $this->emailValidator->getError();
    }

    public function getPasswordError(): ?string
    {
        return $this->passwordValidator->getError();
    }

    public function getUsernameError(): ?string
    {
        return $this->usernameValidator->getError();
    }

    public function validateVideoMetadata(string $title, ?string $description = null): array
    {
        $errors = [];

        $title = trim($title);

        if (empty($title)) {
            $errors['title'] = "Le titre est requis";
        } elseif (strlen($title) < 3) {
            $errors['title'] = "Le titre est trop court (min 3 caractères)";
        } elseif (strlen($title) > 100) {
            $errors['title'] = "Le titre est trop long (max 100 caractères)";
        }

        if ($description !== null && strlen($description) > 5000) {
            $errors['description'] = "La description est trop longue (max 5000 caractères)";
        }

        return $errors;
    }
}