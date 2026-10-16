<?php

namespace App\Services;

use App\Interfaces\EmailProviderInterface;
use App\Repositories\LogRepository;

class EmailService
{
    private LogRepository $logRepo;
    private EmailProviderInterface $provider;
    private string $baseUrl;
    private ?EmailTemplate $template = null;

    public function __construct(
        LogRepository $logRepo,
        EmailProviderInterface $provider,
        string $baseUrl
    ) {
        $this->logRepo = $logRepo;
        $this->provider = $provider;
        $this->baseUrl = rtrim($baseUrl, '/');
    }


    public function sendVerificationEmail(int $userId, string $email, string $username, string $token): bool
    {
        $verificationUrl = $this->baseUrl . '/api/v2/verify-email?token=' . urlencode($token);
        $subject = 'Vérifiez votre adresse email - Laugh Tube';
        $body = $this->getVerificationEmailTemplate($username, $verificationUrl);
        return $this->send($userId, $email, $subject, $body, 'verification');
    }

    public function sendAccountSuspendedEmail(int $userId, string $email, string $username, string $until, string $reason): bool {
        $subject = 'Votre compte a été suspendu - LaughTube';
        $body = $this->getAccountSuspendedTemplate($username, $until, $reason);
        return $this->send($userId, $email, $subject, $body, 'account_suspended', 'legal@laughtube.ca');
    }

    public function sendWelcomeEmail(int $userId, string $email, string $username): bool
    {
        $subject = 'Bienvenue sur Laugh Tube 😃 !';
        $body    = $this->getWelcomeEmailTemplate($username);
        return $this->send($userId, $email, $subject, $body, 'welcome');
    }

    public function send2FAEnabledEmail(int $userId, string $email, string $username): bool
    {
        $subject = 'Authentification 2FA activée - Laugh Tube';
        $body = $this->get2FAEnabledTemplate($username);
        return $this->send($userId, $email, $subject, $body, '2fa_enabled');
    }

    public function sendPasswordResetEmail(int $userId, string $email, string $username, string $token): bool
    {
        $resetUrl = $this->baseUrl . '/#/reset-password?token=' . urlencode($token);
        $subject = 'Réinitialisation de votre mot de passe - Laugh Tube';
        $body = $this->getPasswordResetTemplate($username, $resetUrl);
        return $this->send($userId, $email, $subject, $body, 'password_reset');
    }

    public function sendAccountDeletionEmail(int $userId, string $email, string $username, string $deletionDate): bool
    {
        $cancelUrl = $this->baseUrl . '/#/settings';
        $subject = 'Confirmation de suppression de compte - Laugh Tube';
        $body = $this->getAccountDeletionTemplate($username, $deletionDate, $cancelUrl);
        return $this->send($userId, $email, $subject, $body, 'account_deletion');
    }


    public function sendPasswordChangedEmail(int $userId, string $email, string $username): bool
    {
        $subject = 'Votre mot de passe a été modifié - Laugh Tube';
        $body = $this->getPasswordChangedTemplate($username);
        return $this->send($userId, $email, $subject, $body, 'password_changed');
    }

    public function send2FADisabledEmail(int $userId, string $email, string $username): bool
    {
        $subject = 'Authentification 2FA désactivée - Laugh Tube';
        $body = $this->get2FADisabledTemplate($username);
        return $this->send($userId, $email, $subject, $body, '2fa_disabled');
    }

    public function resendVerificationEmail(int $userId, string $email, string $username, string $token): bool
    {
        return $this->sendVerificationEmail($userId, $email, $username, $token);
    }


    private function send(int $userId, string $to, string $subject, string $body, string $emailType, ?string $replyTo = null): bool
    {
        $emailId = $this->logRepo->logEmail([
            'user_id' => $userId,
            'email_type' => $emailType,
            'recipient' => $to,
            'subject' => $subject,
            'body' => substr($body, 0, 500),
            'status' => 'pending',
        ]);

        $success = $this->provider->sendEmail($to, $subject, $body, true, $replyTo);

        if ($success) {
            if ($emailId) $this->logRepo->updateEmailStatus($emailId, 'sent');
            return true;
        }

        if ($emailId) {
            $this->logRepo->updateEmailStatus($emailId, 'failed', $this->provider->getLastError());
        }

        return false;
    }


    private function tpl(): EmailTemplate
    {
        return $this->template ??= new EmailTemplate($this->baseUrl);
    }

    private function getVerificationEmailTemplate(string $username, string $verificationUrl): string
    {
        $t = $this->tpl();
        $content = $t->icon('mail')
            . $t->title('Plus qu’un clic, ' . $t->highlight($username) . ' !')
            . $t->text('Merci de rejoindre <strong>LaughTube</strong>. Confirmez votre adresse e-mail pour activer votre compte et commencer à partager vos meilleures punchlines.')
            . $t->button($verificationUrl, 'Vérifier mon e-mail')
            . $t->text('Ce lien expire dans <strong>24 heures</strong>. Vous n’avez pas créé de compte ? Ignorez simplement cet e-mail.', 'center', true)
            . $t->link($verificationUrl)
            . $t->signature();
        return $t->layout('Vérifiez votre adresse e-mail', 'Confirmez votre adresse pour activer votre compte LaughTube.', $content);
    }

    private function getAccountSuspendedTemplate(string $username, string $until, string $reason): string
    {
        $t = $this->tpl();
        $untilFormatted = date('d/m/Y à H:i', strtotime($until));
        $content = $t->badge('Compte suspendu', 'red')
            . $t->icon('ban')
            . $t->title('Votre compte est suspendu')
            . $t->text('Bonjour <strong>' . EmailTemplate::e($username) . '</strong>, votre compte LaughTube a été temporairement suspendu.')
            . $t->details(['Raison' => $reason, 'Jusqu’au' => $untilFormatted])
            . $t->text('Pendant cette période, vous ne pourrez pas vous connecter, publier de vidéos, commenter ni interagir avec la communauté.')
            . $t->callout('<strong>Vous pensez que c’est une erreur ?</strong><br>Écrivez-nous depuis <a href="' . $this->baseUrl . '/#/contact" style="color:#2563eb;font-weight:600;">laughtube.ca/contact</a> ou répondez à cet e-mail.', 'amber')
            . $t->signature();
        return $t->layout('Votre compte a été suspendu', 'Votre compte LaughTube est suspendu jusqu’au ' . $untilFormatted . '.', $content);
    }

    private function getWelcomeEmailTemplate(string $username): string
    {
        $t = $this->tpl();
        $content = $t->icon('party')
            . $t->title('Bienvenue dans la gang,<br>' . $t->highlight($username) . ' !')
            . $t->text('Votre adresse est confirmée et votre compte est actif. Il ne reste plus qu’à rire — ou à faire rire.')
            . $t->features([
                ['Partagez vos vidéos', 'Publiez vos sketchs, vos stand-ups et vos meilleures punchlines.'],
                ['Suivez vos humoristes', 'Abonnez-vous aux créateurs qui vous font décrocher la mâchoire.'],
                ['Stand-up en direct', 'Les humoristes montent sur scène en live, vous êtes au premier rang.'],
                ['Battles', 'Deux humoristes s’affrontent, le public vote pour le meilleur.'],
                ['Commentez et réagissez', 'Rejoignez les discussions avec les autres fans d’humour.'],
                ['Compte protégé', 'Activez la double authentification dans vos paramètres.'],
            ])
            . $t->button($this->baseUrl, 'Commencer à rire 😄')
            . $t->signature('À tantôt sur LaughTube,<br>');
        return $t->layout('Bienvenue sur LaughTube', 'Votre compte est actif. On vient pour rire !', $content);
    }

    private function get2FAEnabledTemplate(string $username): string
    {
        $t = $this->tpl();
        $content = $t->icon('shieldcheck')
            . $t->title('Double authentification ' . $t->highlight('activée', '#16a34a'))
            . $t->text('Bonjour <strong>' . EmailTemplate::e($username) . '</strong>, votre compte est maintenant mieux protégé.')
            . $t->callout('À chaque connexion, un code de votre application d’authentification vous sera demandé.', 'green')
            . $t->callout('<strong>Important :</strong> conservez vos codes de secours en lieu sûr. Ils vous permettront de récupérer votre compte si vous perdez votre téléphone.', 'amber')
            . $t->text('Vous n’avez pas activé la 2FA ? Contactez-nous immédiatement.', 'center', true)
            . $t->signature();
        return $t->layout('Authentification 2FA activée', 'La double authentification est activée sur votre compte LaughTube.', $content);
    }

    private function get2FADisabledTemplate(string $username): string
    {
        $t = $this->tpl();
        $content = $t->icon('shieldoff')
            . $t->title('Double authentification ' . $t->highlight('désactivée', '#d97706'))
            . $t->text('Bonjour <strong>' . EmailTemplate::e($username) . '</strong>, la 2FA a été désactivée sur votre compte.')
            . $t->callout('<strong>Attention :</strong> votre compte est maintenant moins protégé. Nous vous recommandons de réactiver la 2FA dans vos paramètres.', 'amber')
            . $t->button($this->baseUrl . '/#/settings', 'Réactiver la 2FA')
            . $t->text('Ce n’était pas vous ? Changez votre mot de passe et contactez-nous immédiatement.', 'center', true)
            . $t->signature();
        return $t->layout('Authentification 2FA désactivée', 'La double authentification a été désactivée sur votre compte.', $content);
    }

    private function getPasswordResetTemplate(string $username, string $resetUrl): string
    {
        $t = $this->tpl();
        $content = $t->icon('key')
            . $t->title('Nouveau mot de passe ?')
            . $t->text('Bonjour <strong>' . EmailTemplate::e($username) . '</strong>, vous avez demandé à réinitialiser votre mot de passe. Pas de panique, ça arrive aux meilleurs.')
            . $t->button($resetUrl, 'Choisir un nouveau mot de passe')
            . $t->text('Ce lien expire dans <strong>1 heure</strong>. Vous n’avez rien demandé ? Ignorez cet e-mail : votre mot de passe reste inchangé.', 'center', true)
            . $t->link($resetUrl)
            . $t->signature();
        return $t->layout('Réinitialisation de votre mot de passe', 'Votre lien pour choisir un nouveau mot de passe (valable 1 heure).', $content);
    }

    private function getPasswordChangedTemplate(string $username): string
    {
        $t = $this->tpl();
        $content = $t->icon('lock')
            . $t->title('Mot de passe ' . $t->highlight('modifié', '#16a34a'))
            . $t->text('Bonjour <strong>' . EmailTemplate::e($username) . '</strong>, le mot de passe de votre compte vient d’être changé.')
            . $t->callout('<strong>Ce n’était pas vous ?</strong><br>Sécurisez votre compte sans attendre et contactez-nous.', 'red')
            . $t->button($this->baseUrl . '/#/contact', 'Contacter le support', 'red')
            . $t->signature();
        return $t->layout('Votre mot de passe a été modifié', 'Le mot de passe de votre compte LaughTube vient d’être changé.', $content);
    }

    private function getAccountDeletionTemplate(string $username, string $deletionDate, string $cancelUrl): string
    {
        $t = $this->tpl();
        $content = $t->icon('trash')
            . $t->title('On vous voit partir… 😢')
            . $t->text('Bonjour <strong>' . EmailTemplate::e($username) . '</strong>, nous avons bien reçu votre demande de suppression de compte.')
            . $t->callout('<strong>Votre compte sera supprimé le ' . EmailTemplate::e($deletionDate) . '.</strong><br>Vos vidéos, commentaires, abonnements et données seront alors effacés définitivement.', 'red')
            . $t->text('Vous avez encore <strong>30 jours</strong> pour changer d’avis. Écrivez-nous et on garde votre place au premier rang.')
            . $t->button($this->baseUrl . '/#/contact', 'Garder mon compte')
            . $t->signature();
        return $t->layout('Confirmation de suppression de compte', 'Votre compte sera supprimé le ' . $deletionDate . '.', $content);
    }

    public function sendAdminMessageEmail(
        int    $userId,
        string $email,
        string $username,
        string $subject,
        string $message
    ): bool {
        $fullSubject = '[LaughTube] ' . $subject;
        $body = $this->getAdminMessageTemplate($username, $subject, $message);
        return $this->send($userId, $email, $fullSubject, $body, 'admin_message', 'legal@laughtube.ca');
    }

    private function getAdminMessageTemplate(string $username, string $subject, string $message): string
    {
        return self::adminMessageHtml($this->tpl(), $this->baseUrl, $username, $subject, $message);
    }

    /** Partagé avec AdminController::sendResendEmail pour un rendu identique. */
    public static function adminMessageHtml(EmailTemplate $t, string $baseUrl, string $username, string $subject, string $message): string
    {
        $content = $t->badge('Message de l’équipe', 'blue')
            . $t->icon('megaphone')
            . $t->title(EmailTemplate::e($subject))
            . $t->text('Bonjour <strong>' . EmailTemplate::e($username) . '</strong>, l’équipe LaughTube vous a envoyé ce message :')
            . $t->message($message)
            . $t->callout('<strong>Une question ?</strong> Répondez à cet e-mail ou écrivez-nous depuis <a href="' . rtrim($baseUrl, '/') . '/#/contact" style="color:#2563eb;font-weight:600;">laughtube.ca/contact</a>.', 'blue')
            . $t->signature();
        return $t->layout($subject, $subject, $content);
    }

    public function sendContactNotificationEmail(
        string $senderName,
        string $senderEmail,
        string $subject,
        string $message
    ): bool {
        $adminEmail = 'legal@laughtube.ca';
        $fullSubject = '[LaughTube Contact] ' . $subject;
        $t = $this->tpl();
        $content = $t->badge('Nouveau message de contact', 'yellow')
            . $t->icon('message')
            . $t->title(EmailTemplate::e($subject))
            . $t->details(['De' => $senderName, 'Courriel' => $senderEmail])
            . $t->message($message)
            . $t->text('Répondez directement à cet e-mail pour écrire à l’expéditeur.', 'center', true);
        $body = $t->layout($fullSubject, 'Message de ' . $senderName . ' : ' . $subject, $content);

        return $this->provider->sendEmail($adminEmail, $fullSubject, $body, true, $senderEmail);
    }
}
