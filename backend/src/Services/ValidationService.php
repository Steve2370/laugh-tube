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
            $errors['email'] = "L'email est requis";
        } elseif (!$this->validateEmail($email)) {
            $errors['email'] = $this->getEmailError() ?? "Email invalide";
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

    public function validateLogin(array $data): ?array
    {
        $errors = [];

        if (!isset($data['email']) || empty($data['email'])) {
            $errors['email'] = "L'email est requis";
        }

        if (!isset($data['password']) || empty($data['password'])) {
            $errors['password'] = "Le mot de passe est requis";
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

    public function validateProfileUpdate(string $username, string $email, ?string $bio = null): array
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

        if ($bio !== null && strlen($bio) > 500) {
            $errors['bio'] = "La bio ne peut pas dépasser 500 caractères";
        }

        return $errors;
    }

    public function validatePasswordChange(string $currentPassword, string $newPassword, string $confirmPassword): array
    {
        $errors = [];

        if (empty($currentPassword)) {
            $errors['current_password'] = "Le mot de passe actuel est requis";
        }

        if (empty($newPassword)) {
            $errors['new_password'] = "Le nouveau mot de passe est requis";
        } elseif (!$this->validatePassword($newPassword)) {
            $errors['new_password'] = $this->getPasswordError() ?? "Nouveau mot de passe invalide";
        }

        if (empty($confirmPassword)) {
            $errors['confirm_password'] = "La confirmation est requise";
        } elseif ($newPassword !== $confirmPassword) {
            $errors['confirm_password'] = "Les mots de passe ne correspondent pas";
        }

        if (!empty($currentPassword) && !empty($newPassword) && $currentPassword === $newPassword) {
            $errors['new_password'] = "Le nouveau mot de passe doit être différent de l'ancien";
        }

        return $errors;
    }

    public function validateComment(string $content): array
    {
        $errors = [];

        $content = trim($content);

        if (empty($content)) {
            $errors['content'] = "Le commentaire ne peut pas être vide";
        } elseif (strlen($content) < 1) {
            $errors['content'] = "Le commentaire est trop court";
        } elseif (strlen($content) > 2000) {
            $errors['content'] = "Le commentaire est trop long (max 2000 caractères)";
        }

        return $errors;
    }

    public function validateReply(string $content): array
    {
        $errors = [];

        $content = trim($content);

        if (empty($content)) {
            $errors['content'] = "La réponse ne peut pas être vide";
        } elseif (strlen($content) > 1000) {
            $errors['content'] = "La réponse est trop longue (max 1000 caractères)";
        }

        return $errors;
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

    public function validate2FACode(string $code): array
    {
        $errors = [];

        $code = trim($code);

        if (empty($code)) {
            $errors['code'] = "Le code 2FA est requis";
        } elseif (!ctype_digit($code)) {
            $errors['code'] = "Le code doit contenir uniquement des chiffres";
        } elseif (strlen($code) !== 6) {
            $errors['code'] = "Le code doit contenir exactement 6 chiffres";
        }

        return $errors;
    }

    public function validateBio(string $bio): array
    {
        $errors = [];

        if (strlen($bio) > 500) {
            $errors['bio'] = "La bio ne peut pas dépasser 500 caractères";
        }

        return $errors;
    }

    public function validateEmailToken(string $token): array
    {
        $errors = [];

        $token = trim($token);

        if (empty($token)) {
            $errors['token'] = "Le token est requis";
        } elseif (strlen($token) < 32) {
            $errors['token'] = "Token invalide";
        }

        return $errors;
    }

    public function validatePagination(int $limit, int $offset): array
    {
        $errors = [];

        if ($limit < 1) {
            $errors['limit'] = "La limite doit être au moins 1";
        } elseif ($limit > 100) {
            $errors['limit'] = "La limite ne peut pas dépasser 100";
        }

        if ($offset < 0) {
            $errors['offset'] = "L'offset ne peut pas être négatif";
        }

        return $errors;
    }

    public function validateUrl(string $url): array
    {
        $errors = [];

        $url = trim($url);

        if (empty($url)) {
            $errors['url'] = "L'URL est requise";
        } elseif (!filter_var($url, FILTER_VALIDATE_URL)) {
            $errors['url'] = "URL invalide";
        } elseif (!preg_match('/^https?:\/\//', $url)) {
            $errors['url'] = "L'URL doit commencer par http:// ou https://";
        }

        return $errors;
    }

    public function validateFileUpload(array $file, string $type = 'image'): array
    {
        $errors = [];

        if (!isset($file['error'])) {
            $errors['file'] = "Fichier invalide";
            return $errors;
        }

        if ($file['error'] !== UPLOAD_ERR_OK) {
            $errors['file'] = match($file['error']) {
                UPLOAD_ERR_INI_SIZE => "Fichier trop volumineux",
                UPLOAD_ERR_FORM_SIZE => "Fichier trop volumineux",
                UPLOAD_ERR_PARTIAL => "Upload partiel",
                UPLOAD_ERR_NO_FILE => "Aucun fichier",
                default => "Erreur d'upload"
            };
            return $errors;
        }

        // Taille
        $maxSize = ($type === 'video') ? 524288000 : 5242880; // 500MB ou 5MB

        if ($file['size'] > $maxSize) {
            $maxMB = round($maxSize / 1048576);
            $errors['file'] = "Fichier trop volumineux (max {$maxMB}MB)";
        }

        return $errors;
    }

    public function hasErrors(array $errors): bool
    {
        return !empty($errors);
    }

    public function formatErrors(array $errors): array
    {
        return [
            'success' => false,
            'errors' => $errors,
            'message' => 'Erreurs de validation'
        ];
    }
}