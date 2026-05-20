<?php

namespace App\Services;

use App\Interfaces\EmailProviderInterface;
use App\Repositories\LogRepository;

class EmailService
{
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
        $this->baseUrl = rtrim($baseUrl, '/');
    }


    public function sendVerificationEmail(int $userId, string $email, string $username, string $token): bool
    {
        $verificationUrl = $this->baseUrl . '/verify-email.php?token=' . urlencode($token);
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


    private function logoHtml(): string
    {
        $logoUrl = $this->baseUrl . '/logo.png';
        return '<img src="' . $logoUrl . '" alt="LaughTube" width="200" style="display:block;margin:0 auto;max-width:200px;height:auto;">';
    }


    private function getVerificationEmailTemplate(string $username, string $verificationUrl): string
    {
        $logo = $this->logoHtml();
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f0f0f0;margin:0;padding:0;}
  .wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);}
  .header{background:#ffffff;padding:24px;text-align:center;}
  .content{padding:32px;}
  .btn{display:inline-block;padding:13px 32px;background:#111;color:#fff !important;text-decoration:none;border-radius:6px;font-weight:bold;margin:20px 0;}
  .link-box{word-break:break-all;background:#f5f5f5;padding:12px;border-radius:4px;font-size:13px;}
  .footer{text-align:center;padding:16px;font-size:12px;color:#999;background:#f5f5f5;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">{$logo}</div>
  <div class="content">
    <h2>Bonjour {$username} !</h2>
    <p>Merci de vous être inscrit sur <strong>Laugh Tube</strong>. Pour activer votre compte, vérifiez votre adresse email :</p>
    <p style="text-align:center;"><a href="{$verificationUrl}" class="btn">Vérifier mon email</a></p>
    <p>Ou copiez ce lien :</p>
    <p class="link-box">{$verificationUrl}</p>
    <p><small>Ce lien expire dans <strong>24 heures</strong>. Si vous n'avez pas créé de compte, ignorez cet email.</small></p>
  </div>
  <div class="footer">© 2026 Laugh Tube. Tous droits réservés.</div>
</div>
</body></html>
HTML;
    }

    private function getAccountSuspendedTemplate(
        string $username,
        string $until,
        string $reason
    ): string {
        $logo = $this->logoHtml();
        $siteUrl = $this->baseUrl;
        $replyEmail = 'legal@laughtube.ca';
        $untilFormatted = date('d/m/Y à H:i', strtotime($until));

        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f0f0f0;margin:0;padding:0;}
  .wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);}
  .header{background:#ffffff;padding:24px;text-align:center;}
  .badge{display:inline-block;background:#dc3545;color:#fff;font-size:11px;font-weight:bold;padding:4px 14px;border-radius:20px;margin-top:12px;letter-spacing:1px;text-transform:uppercase;}
  .content{padding:32px;}
  .danger{background:#f8d7da;border-left:4px solid #dc3545;padding:16px;border-radius:0 8px 8px 0;margin:20px 0;}
  .info-box{background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;}
  .info-box strong{display:inline-block;width:90px;color:#555;}
  .reply-box{background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:14px;margin-top:20px;font-size:13px;}
  .footer{text-align:center;padding:16px;font-size:12px;color:#999;background:#f5f5f5;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    {$logo}
    <div class="badge">⚠️ Compte suspendu</div>
  </div>
  <div class="content">
    <h2 style="color:#111;">Bonjour {$username},</h2>
    <div class="danger">
      <strong>Votre compte LaughTube a été temporairement suspendu.</strong>
    </div>
    <div class="info-box">
      <div><strong>Raison :</strong> {$reason}</div>
      <div style="margin-top:8px;"><strong>Jusqu'au :</strong> {$untilFormatted}</div>
    </div>
    <p>Pendant cette période, vous ne pourrez pas vous connecter, uploader de vidéos, commenter ou interagir avec la communauté.</p>
    <p>Si vous pensez que cette suspension est une erreur, vous pouvez contacter notre équipe :</p>
    <div class="reply-box">
      <strong>Contacter le support :</strong><br>
      Écrivez-nous à <a href="{$siteUrl}/#/contact" style="color:#111;font-weight:bold;">laughtube.ca/contact</a>
    </div>
  </div>
  <div class="footer">© 2026 LaughTube. Tous droits réservés. · <a href="{$siteUrl}" style="color:#999;">laughtube.ca</a></div>
</div>
</body></html>
HTML;
    }

    private function getWelcomeEmailTemplate(string $username): string
    {
        $logo = $this->logoHtml();
        $siteUrl = $this->baseUrl;
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f0f0f0;margin:0;padding:0;}
  .wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);}
  .header{background:#ffffff;padding:24px;text-align:center;}
  .content{padding:32px;}
  .feature{background:#f9f9f9;padding:14px;margin:10px 0;border-radius:6px;border-left:4px solid #111;}
  .btn{display:inline-block;padding:13px 32px;background:#111;color:#fff !important;text-decoration:none;border-radius:6px;font-weight:bold;margin:20px 0;}
  .footer{text-align:center;padding:16px;font-size:12px;color:#999;background:#f5f5f5;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">{$logo}</div>
  <div class="content">
    <h2>Bienvenue sur Laugh Tube, {$username} !</h2>
    <p>Votre email a été vérifié avec succès. Votre compte est maintenant actif !</p>
    <h3>Ce que vous pouvez faire :</h3>
    <div class="feature"><strong>Partager vos vidéos</strong><br>Uploadez vos punchlines avec la communauté.</div>
    <div class="feature"><strong>Suivre des créateurs</strong><br>Découvrez du contenu hilarant de créateurs talentueux.</div>
    <div class="feature"><strong>Commenter et interagir</strong><br>Rejoignez les discussions et connectez-vous avec d'autres fans.</div>
    <div class="feature"><strong>Participez à des Stand-Up en live</strong><br>Les Humoristes peuvent faire leur performances en live.</div>
    <div class="feature"><strong>Assistez ou participez à des Battles</strong><br>deux humoristes s'affrontent dans un clash divertissant.</div>
    <div class="feature"><strong>Sécurité renforcée</strong><br>Activez la 2FA pour protéger votre compte.</div>
    <p style="text-align:center;"><a href="{$siteUrl}" class="btn">Commencer maintenant</a></p>
  </div>
  <div class="footer">© 2026 Laugh Tube. Tous droits réservés.</div>
</div>
</body></html>
HTML;
    }

    private function get2FAEnabledTemplate(string $username): string
    {
        $logo = $this->logoHtml();
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f0f0f0;margin:0;padding:0;}
  .wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);}
  .header{background:#ffffff;padding:24px;text-align:center;}
  .content{padding:32px;}
  .warning{background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0;border-radius:4px;}
  .success{background:#d4edda;border-left:4px solid #28a745;padding:15px;margin:20px 0;border-radius:4px;}
  .footer{text-align:center;padding:16px;font-size:12px;color:#999;background:#f5f5f5;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">{$logo}</div>
  <div class="content">
    <h2>Bonjour {$username} !</h2>
    <div class="success">L'authentification à deux facteurs (2FA) a été <strong>activée</strong> sur votre compte.</div>
    <p>À partir de maintenant, vous devrez entrer un code depuis votre application d'authentification lors de chaque connexion.</p>
    <div class="warning">
      <strong>⚠️ Important</strong><br>
      Conservez vos codes de secours dans un endroit sûr. Ils vous permettront d'accéder à votre compte si vous perdez votre application.
    </div>
    <p>Si vous n'avez pas activé la 2FA, contactez-nous immédiatement.</p>
  </div>
  <div class="footer">© 2026 Laugh Tube. Tous droits réservés.</div>
</div>
</body></html>
HTML;
    }

    private function get2FADisabledTemplate(string $username): string
    {
        $logo = $this->logoHtml();
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f0f0f0;margin:0;padding:0;}
  .wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);}
  .header{background:#ffffff;padding:24px;text-align:center;}
  .content{padding:32px;}
  .warning{background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0;border-radius:4px;}
  .footer{text-align:center;padding:16px;font-size:12px;color:#999;background:#f5f5f5;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">{$logo}</div>
  <div class="content">
    <h2>Bonjour {$username} !</h2>
    <p>L'authentification à deux facteurs (2FA) a été <strong>désactivée</strong> sur votre compte.</p>
    <div class="warning">
      <strong>⚠️ Attention</strong><br>
      Votre compte est maintenant moins sécurisé. Nous vous recommandons de réactiver la 2FA dans vos paramètres.
    </div>
    <p>Si vous n'avez pas effectué cette action, contactez-nous immédiatement et changez votre mot de passe.</p>
  </div>
  <div class="footer">© 2026 Laugh Tube. Tous droits réservés.</div>
</div>
</body></html>
HTML;
    }

    private function getPasswordResetTemplate(string $username, string $resetUrl): string
    {
        $logo = $this->logoHtml();
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f0f0f0;margin:0;padding:0;}
  .wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);}
  .header{background:#ffffff;padding:24px;text-align:center;}
  .content{padding:32px;}
  .btn{display:inline-block;padding:13px 32px;background:#dc3545;color:#fff !important;text-decoration:none;border-radius:6px;font-weight:bold;margin:20px 0;}
  .link-box{word-break:break-all;background:#f5f5f5;padding:12px;border-radius:4px;font-size:13px;}
  .footer{text-align:center;padding:16px;font-size:12px;color:#999;background:#f5f5f5;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">{$logo}</div>
  <div class="content">
    <h2>Bonjour {$username} !</h2>
    <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
    <p style="text-align:center;"><a href="{$resetUrl}" class="btn">Réinitialiser mon mot de passe</a></p>
    <p>Ou copiez ce lien :</p>
    <p class="link-box">{$resetUrl}</p>
    <p><strong>Ce lien expire dans 1 heure.</strong></p>
    <p><small>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</small></p>
  </div>
  <div class="footer">© 2026 Laugh Tube. Tous droits réservés.</div>
</div>
</body></html>
HTML;
    }

    private function getPasswordChangedTemplate(string $username): string
    {
        $logo = $this->logoHtml();
        $siteUrl = $this->baseUrl;
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f0f0f0;margin:0;padding:0;}
  .wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);}
  .header{background:#ffffff;padding:24px;text-align:center;}
  .content{padding:32px;}
  .success{background:#d4edda;border-left:4px solid #28a745;padding:15px;margin:20px 0;border-radius:4px;}
  .warning{background:#fff3cd;border-left:4px solid #ffc107;padding:15px;margin:20px 0;border-radius:4px;}
  .footer{text-align:center;padding:16px;font-size:12px;color:#999;background:#f5f5f5;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">{$logo}</div>
  <div class="content">
    <h2>Bonjour {$username} !</h2>
    <div class="success">Votre mot de passe a été modifié avec succès.</div>
    <div class="warning">
      <strong>Ce n'était pas vous ?</strong><br>
      Si vous n'avez pas effectué ce changement, contactez-nous immédiatement et sécurisez votre compte.
    </div>
  </div>
  <div class="footer">© 2026 Laugh Tube. Tous droits réservés.</div>
</div>
</body></html>
HTML;
    }

    private function getAccountDeletionTemplate(string $username, string $deletionDate, string $cancelUrl): string
    {
        $logo = $this->logoHtml();
        $siteUrl = $this->baseUrl;
        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f0f0f0;margin:0;padding:0;}
  .wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);}
  .header{background:#ffffff;padding:24px;text-align:center;}
  .content{padding:32px;}
  .btn{display:inline-block;padding:13px 32px;background:#28a745;color:#fff !important;text-decoration:none;border-radius:6px;font-weight:bold;margin:20px 0;}
  .danger{background:#f8d7da;border-left:4px solid #dc3545;padding:15px;margin:20px 0;border-radius:4px;}
  .footer{text-align:center;padding:16px;font-size:12px;color:#999;background:#f5f5f5;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">{$logo}</div>
  <div class="content">
    <h2>Bonjour {$username},</h2>
    <p>Nous sommes désolés de vous voir partir 😢</p>
    <div class="danger">
      <strong>Votre compte sera supprimé le {$deletionDate}.</strong><br>
      Toutes vos vidéos, commentaires, abonnements et données seront perdus définitivement.
    </div>
    <p>Vous avez encore 30 jours pour changer d'avis :</p>
    <strong>Contacter le support :</strong><br>
      Écrivez-nous à <a href="{$siteUrl}/#/contact" style="color:#111;font-weight:bold;">laughtube.ca/contact</a>
  </div>
  <div class="footer">© 2026 Laugh Tube. Tous droits réservés.</div>
</div>
</body></html>
HTML;
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

    private function getAdminMessageTemplate(
        string $username,
        string $subject,
        string $message
    ): string {
        $logo = $this->logoHtml();
        $messageHtml = nl2br(htmlspecialchars($message));
        $replyEmail = 'legal@laughtube.ca';
        $siteUrl = $this->baseUrl;

        return <<<HTML
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;line-height:1.6;color:#333;background:#f0f0f0;margin:0;padding:0;}
  .wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);}
  .header{background:#ffffff;padding:24px;text-align:center;}
  .badge{display:inline-block;background:#fff;color:#111;font-size:11px;font-weight:bold;padding:4px 12px;border-radius:20px;margin-top:12px;letter-spacing:1px;text-transform:uppercase;}
  .content{padding:32px;}
  .subject{font-size:20px;font-weight:bold;color:#111;margin-bottom:16px;padding-bottom:16px;border-bottom:2px solid #f0f0f0;}
  .message-box{background:#f9f9f9;border-left:4px solid #111;padding:20px;border-radius:0 8px 8px 0;margin:20px 0;font-size:15px;line-height:1.7;}
  .reply-box{background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:16px;margin-top:24px;font-size:13px;}
  .reply-email{color:#111;font-weight:bold;}
  .footer{text-align:center;padding:16px;font-size:12px;color:#999;background:#f5f5f5;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    {$logo}
    <div class="badge">Message de l'administration</div>
  </div>
  <div class="content">
    <p>Bonjour <strong>{$username}</strong>,</p>
    <p>L'équipe d'administration de LaughTube vous a envoyé le message suivant :</p>
    <div class="subject">{$subject}</div>
    <div class="message-box">{$messageHtml}</div>
    <div class="reply-box">
      <strong>Pour répondre ou contacter l'équipe :</strong><br>
      <strong>Contacter le support :</strong><br>
      Écrivez-nous à <a href="{$siteUrl}/#/contact" style="color:#111;font-weight:bold;">laughtube.ca/contact</a>
    </div>
  </div>
  <div class="footer">© 2026 LaughTube. Tous droits réservés. · <a href="{$siteUrl}" style="color:#999;">laughtube.ca</a></div>
</div>
</body></html>
HTML;
    }

    public function sendContactNotificationEmail(
        string $senderName,
        string $senderEmail,
        string $subject,
        string $message
    ): bool {
        $adminEmail = 'legal@laughtube.ca';
        $fullSubject = '[LaughTube Contact] ' . $subject;
        $messageHtml = nl2br(htmlspecialchars($message));
        $logo = $this->logoHtml();
        $baseUrl = $this->baseUrl;
        $siteUrl = $this->baseUrl;

        $body = <<<HTML
<!DOCTYPE html><html lang="fr">
<head><meta charset="UTF-8">
<style>
  body{font-family:Arial,sans-serif;background:#f0f0f0;margin:0;padding:0;}
  .wrap{max-width:600px;margin:30px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.1);}
  .header{background:#ffffff;padding:24px;text-align:center;}
  .badge{display:inline-block;background:#fff;color:#111;font-size:11px;font-weight:bold;padding:4px 12px;border-radius:20px;margin-top:12px;letter-spacing:1px;text-transform:uppercase;}
  .content{padding:32px;}
  .meta{background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:20px;font-size:13px;}
  .meta strong{display:inline-block;width:80px;color:#555;}
  .subject{font-size:18px;font-weight:bold;color:#111;margin-bottom:16px;padding-bottom:12px;border-bottom:2px solid #f0f0f0;}
  .message-box{background:#f9f9f9;border-left:4px solid #111;padding:20px;border-radius:0 8px 8px 0;font-size:14px;line-height:1.7;}
  .footer{text-align:center;padding:16px;font-size:12px;color:#999;background:#f5f5f5;}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">{$logo}<div class="badge">Nouveau message de contact</div></div>
  <div class="content">
    <div class="meta">
      <div><strong>De :</strong> {$senderName} &lt;{$senderEmail}&gt;</div>
    </div>
    <div class="subject">{$subject}</div>
    <div class="message-box">{$messageHtml}</div>
    <p style="margin-top:20px;font-size:13px;color:#666;">
      Pour répondre, <strong>Contacter le support :</strong><br>
      Écrivez-nous à <a href="{$siteUrl}/#/contact" style="color:#111;font-weight:bold;">laughtube.ca/contact</a>
    </p>
  </div>
  <div class="footer">© 2026 LaughTube · <a href="{$baseUrl}" style="color:#999;">laughtube.ca</a></div>
</div>
</body></html>
HTML;

        return $this->provider->sendEmail($adminEmail, $fullSubject, $body, true, $senderEmail);
    }
}