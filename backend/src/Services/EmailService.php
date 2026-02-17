<?php

namespace App\Services;

use App\Interfaces\EmailProviderInterface;
use App\Repositories\LogRepository;

class EmailService {

    private LogRepository $logRepo;
    private EmailProviderInterface $provider;
    private string $baseUrl;

    public function __construct(
        LogRepository $logRepo,
        EmailProviderInterface $provider,
        string $baseUrl
    ) {
        $this->logRepo = $logRepo;
        $this->provider = $provider;
        $this->baseUrl = $baseUrl;
    }
    public function sendVerificationEmail(int $userId, string $email, string $username, string $token): bool
    {
        $verificationUrl = $this->baseUrl . '/verify-email.php?token=' . urlencode($token);

        $subject = 'Vérifiez votre adresse email - Laugh Tale';
        $body = $this->getVerificationEmailTemplate($username, $verificationUrl);

        $body = preg_replace(
            '#src=(["\'])/logo\.png\1#',
            'src="' . $this->baseUrl . '/logo.png"',
            $body
        );

        $sentVerification = $this->send($userId, $email, $subject, $body, 'verification');
        $sentWelcome = $sentVerification ? $this->sendWelcomeEmail($userId, $email, $username) : false;

        return $sentVerification && $sentWelcome;
    }


    public function sendWelcomeEmail(int $userId, string $email, string $username): bool {
        $subject = 'Bienvenue sur Laugh Tube 😃!!!';
        $body = $this->getWelcomeEmailTemplate($username);

        return $this->send($userId, $email, $subject, $body, 'welcome');
    }

    public function send2FAEnabledEmail(int $userId, string $email, string $username): bool {
        $subject = 'Authentification 2FA activée - Laugh Tube';
        $body = $this->get2FAEnabledTemplate($username);

        return $this->send($userId, $email, $subject, $body, '2fa_enabled');
    }

    public function sendPasswordResetEmail(int $userId, string $email, string $username, string $token): bool {
        $resetUrl = $this->baseUrl . '/reset-password.php?token=' . $token;

        $subject = 'Réinitialisation de votre mot de passe - Laugh Tube';
        $body = $this->getPasswordResetTemplate($username, $resetUrl);

        return $this->send($userId, $email, $subject, $body, 'password_reset');
    }

    public function sendAccountDeletionEmail(int $userId, string $email, string $username, string $deletionDate): bool {
        $cancelUrl = $this->baseUrl . '/cancel-deletion.php';

        $subject = 'Confirmation de suppression de compte - Laugh Tube';
        $body = $this->getAccountDeletionTemplate($username, $deletionDate, $cancelUrl);

        return $this->send($userId, $email, $subject, $body, 'account_deletion');
    }

    private function send(int $userId, string $to, string $subject, string $body, string $emailType): bool {

        $emailId = $this->logRepo->logEmail([
            'user_id' => $userId,
            'email_type' => $emailType,
            'recipient' => $to,
            'subject' => $subject,
            'body' => substr($body, 0, 500),
            'status' => 'pending'
        ]);

        $success = $this->provider->sendEmail($to, $subject, $body, true);

        if ($success) {
            if ($emailId) {
                $this->logRepo->updateEmailStatus($emailId, 'sent');
            }
            return true;
        }

        if ($emailId) {
            $this->logRepo->updateEmailStatus(
                $emailId,
                'failed',
                $this->provider->getLastError()
            );
        }

        return false;
    }

    private function getVerificationEmailTemplate(string $username, string $verificationUrl): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 30px; background: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div className="mb-2 flex justify-center">
                <img 
                    src="/logo.png" 
                    alt="LaughTube Logo"
                    width="250"
                    style="display:block; margin:0 auto; max-width:250px; height:auto;"
                >
            </div>
        </div>
        <div class="content">
            <h2>Bonjour {$username} !</h2>
            <p>Merci de vous être inscrit sur Laugh Tube. Pour activer votre compte, veuillez vérifier votre adresse email en cliquant sur le bouton ci-dessous :</p>
            <p style="text-align: center;">
                <a href="{$verificationUrl}" class="button">Vérifier mon email</a>
            </p>
            <p>Ou copiez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 3px;">{$verificationUrl}</p>
            <p>Ce lien expire dans 24 heures.</p>
            <p>Si vous n'avez pas créé de compte, ignorez cet email.</p>
        </div>
        <div class="footer">
            <p>© 2026 Laugh Tube. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    private function getWelcomeEmailTemplate(string $username): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div className="mb-2 flex justify-center">
                <img 
                    src="/logo.png" 
                    alt="LaughTube Logo"
                    width="250"
                    style="display:block; margin:0 auto; max-width:250px; height:auto;"
                >
            </div>
        </div>
        <div class="content">
            <h1>Bienvenue sur Laugh Tube !</h1>
            <h2>Bonjour {$username} !</h2>
            <p>Votre email a été vérifié avec succès. Votre compte est maintenant actif !</p>
            <h3>Que pouvez-vous faire sur Laugh Tube ?</h3>
            <div class="feature">
                <strong>Partager vos vidéos</strong><br>
                Uploadez et partagez vos punchlines avec la communauté.
            </div>
            <div class="feature">
                <strong>Suivre d'autres créateurs</strong><br>
                Découvrez du contenu hilarant de créateurs talentueux.
            </div>
            <div class="feature">
                <strong>Commenter et interagir</strong><br>
                Rejoignez les discussions et connectez-vous avec d'autres fans.
            </div>
            <div class="feature">
                <strong>Sécurité renforcée</strong><br>
                Activez l'authentification à deux facteurs pour protéger votre compte.
            </div>
            <p>Commencez dès maintenant et amusez-vous bien !</p>
        </div>
        <div class="footer">
            <p>© 2026 Laugh Tube. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    private function get2FAEnabledTemplate(string $username): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #17a2b8; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div className="mb-2 flex justify-center">
                <img 
                    src="/logo.png" 
                    alt="LaughTube Logo"
                    width="250"
                    style="display:block; margin:0 auto; max-width:250px; height:auto;"
                >
            </div>
            <h1>Authentification 2FA Activée</h1>
        </div>
        <div class="content">
            <h2>Bonjour {$username} !</h2>
            <p>L'authentification à deux facteurs (2FA) a été activée avec succès sur votre compte.</p>
            <p>À partir de maintenant, vous devrez entrer un code de vérification depuis votre application d'authentification lors de chaque connexion.</p>
            <div class="warning">
                <strong>*** Important ***</strong><br>
                Conservez vos codes de secours dans un endroit sûr. Ils vous permettront d'accéder à votre compte si vous perdez l'accès à votre application d'authentification.
            </div>
            <p>Si vous n'avez pas activé la 2FA, contactez-nous immédiatement.</p>
        </div>
        <div class="footer">
            <p>© 2026 Laugh Tube. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    private function getPasswordResetTemplate(string $username, string $resetUrl): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 30px; background: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div className="mb-2 flex justify-center">
                <img 
                    src="/logo.png" 
                    alt="LaughTube Logo"
                    width="250"
                    style="display:block; margin:0 auto; max-width:250px; height:auto;"
                >
            </div>
            <h1>Réinitialisation de mot de passe</h1>
        </div>
        <div class="content">
            <h2>Bonjour {$username} !</h2>
            <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
            <p style="text-align: center;">
                <a href="{$resetUrl}" class="button">Réinitialiser mon mot de passe</a>
            </p>
            <p>Ou copiez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; background: #fff; padding: 10px; border-radius: 3px;">{$resetUrl}</p>
            <p><strong>Ce lien expire dans 1 heure.</strong></p>
            <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email et votre mot de passe restera inchangé.</p>
        </div>
        <div class="footer">
            <p>© 2026 Laugh Tube. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
HTML;
    }

    private function getAccountDeletionTemplate(string $username, string $deletionDate, string $cancelUrl): string {
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #6c757d; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
        .button { display: inline-block; padding: 12px 30px; background: #28a745; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div className="mb-2 flex justify-center">
                <img 
                    src="/logo.png" 
                    alt="LaughTube Logo"
                    width="250"
                    style="display:block; margin:0 auto; max-width:250px; height:auto;"
                >
            </div>
            <h1>Suppression de compte programmée</h1>
        </div>
        <div class="content">
            <h2>Bonjour {$username},</h2>
            <p>Votre demande de suppression de compte a été enregistrée.</p>
            <p><strong>Votre compte sera définitivement supprimé le {$deletionDate}.</strong></p>
            <p>Pendant ce délai de 30 jours, vous pouvez annuler cette suppression à tout moment.</p>
            <p style="text-align: center;">
                <a href="{$cancelUrl}" class="button">Annuler la suppression</a>
            </p>
            <p>Une fois le compte supprimé, toutes vos données seront perdues définitivement :</p>
            <ul>
                <li>Vos vidéos</li>
                <li>Vos commentaires</li>
                <li>Vos abonnements</li>
                <li>Votre historique</li>
            </ul>
            <p>Si vous avez des questions, contactez notre support.</p>
        </div>
        <div class="footer">
            <p>© 2026 Laugh Tube. Tous droits réservés.</p>
        </div>
    </div>
</body>
</html>
HTML;
    }
}