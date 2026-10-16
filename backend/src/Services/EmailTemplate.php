<?php

namespace App\Services;

/**
 * Gabarit des e-mails LaughTube, aligné sur le thème « Fou rire » du site :
 * fond clair à points, doodles au trait, carte blanche arrondie, boutons bleus.
 *
 * Écrit pour les clients mail : tableaux, styles en ligne, images hébergées sur
 * laughtube.ca/email/. Toute valeur venant d'un utilisateur passe par e().
 */
class EmailTemplate
{
    private const FONT = "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

    public function __construct(private string $baseUrl)
    {
        $this->baseUrl = rtrim($baseUrl, '/');
    }

    /** Échappe une valeur fournie par un utilisateur avant de l'insérer dans le HTML. */
    public static function e(?string $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    public function asset(string $file): string
    {
        return $this->baseUrl . '/email/' . $file;
    }

    /**
     * @param string      $title     titre du document (déjà sûr)
     * @param string      $preheader aperçu affiché dans la boîte de réception (texte brut)
     * @param string      $content   HTML construit avec les méthodes de cette classe
     */
    public function layout(string $title, string $preheader, string $content): string
    {
        $font = self::FONT;
        $site = $this->baseUrl;
        $header = $this->asset('header.jpg');
        $mascot = $this->asset('mascot.png');
        $pre = self::e($preheader);
        $titleSafe = self::e($title);
        $year = date('Y');

        return <<<HTML
<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>{$titleSafe}</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet">
<style>
  body{margin:0!important;padding:0!important;background:#f4f6fb;}
  a{color:#2563eb;}
  @media only screen and (max-width:620px){
    .lt-container{width:100%!important;}
    .lt-pad{padding-left:22px!important;padding-right:22px!important;}
    .lt-title{font-size:23px!important;}
  }
</style>
</head>
<body style="margin:0;padding:0;background-color:#f4f6fb;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:#f4f6fb;">{$pre}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f4f6fb" style="background-color:#f4f6fb;background-image:radial-gradient(circle,rgba(100,116,139,.22) 1.1px,transparent 1.6px);background-size:24px 24px;">
  <tr><td align="center" style="padding:28px 12px 40px;">
    <table role="presentation" class="lt-container" width="600" cellspacing="0" cellpadding="0" border="0" style="width:600px;max-width:600px;">
      <tr><td style="border-radius:22px 22px 0 0;border:1px solid #e5e7eb;border-bottom:0;overflow:hidden;">
        <a href="{$site}" style="text-decoration:none;"><img src="{$header}" width="600" alt="LaughTube — l'humour d'ici" style="display:block;width:100%;max-width:600px;height:auto;border:0;border-radius:22px 22px 0 0;font-family:{$font};font-size:22px;font-weight:800;color:#111827;"></a>
      </td></tr>
      <tr><td style="font-size:0;line-height:0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
          <td height="4" bgcolor="#3b82f6" style="height:4px;background-color:#3b82f6;"></td>
          <td height="4" bgcolor="#eab308" style="height:4px;background-color:#eab308;"></td>
          <td height="4" bgcolor="#ef4444" style="height:4px;background-color:#ef4444;"></td>
          <td height="4" bgcolor="#0ea5e9" style="height:4px;background-color:#0ea5e9;"></td>
        </tr></table>
      </td></tr>
      <tr><td class="lt-pad" bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 22px 22px;padding:36px 40px 34px;font-family:{$font};font-size:15px;line-height:1.7;color:#374151;box-shadow:0 18px 40px rgba(15,23,42,.08);">
{$content}
      </td></tr>
      <tr><td align="center" style="padding:28px 24px 0;font-family:{$font};">
        <img src="{$mascot}" width="48" height="48" alt="" style="display:block;margin:0 auto 10px;border:0;border-radius:50%;">
        <p style="margin:0;font-size:14px;font-weight:600;color:#1e40af;">On vient pour rire 😄</p>
        <p style="margin:10px 0 0;font-size:12px;line-height:1.8;color:#6b7280;">
          <a href="{$site}" style="color:#2563eb;text-decoration:none;font-weight:600;">laughtube.ca</a>
          &nbsp;·&nbsp; <a href="{$site}/#/contact" style="color:#2563eb;text-decoration:none;">Contact</a>
          &nbsp;·&nbsp; <a href="https://apps.apple.com/app/id6771074500" style="color:#2563eb;text-decoration:none;">App iPhone</a><br>
          Vous recevez cet e-mail au sujet de votre compte LaughTube.<br>
          <span style="color:#9ca3af;">© {$year} LaughTube · Fait au Québec</span>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
HTML;
    }

    public function icon(string $name): string
    {
        $src = $this->asset("icon-{$name}.png");
        return '<table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto 20px;"><tr><td align="center">'
            . '<img src="' . $src . '" width="64" height="64" alt="" style="display:block;width:64px;height:64px;border:0;"></td></tr></table>';
    }

    /** Pastille au-dessus du titre (ex. « Compte suspendu »). */
    public function badge(string $label, string $tone = 'blue'): string
    {
        [$fg, $bg] = self::tone($tone);
        return '<p style="margin:0 0 14px;text-align:center;"><span style="display:inline-block;padding:5px 14px;border-radius:999px;background-color:' . $bg . ';color:' . $fg
            . ';font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">' . self::e($label) . '</span></p>';
    }

    /** Titre : $html peut contenir des balises sûres (ex. un <span> coloré) ; échapper les valeurs avant. */
    public function title(string $html): string
    {
        return '<h1 class="lt-title" style="margin:0 0 12px;font-family:' . self::FONT . ';font-size:26px;line-height:1.25;font-weight:800;color:#0f172a;text-align:center;">' . $html . '</h1>';
    }

    public function text(string $html, string $align = 'center', bool $muted = false): string
    {
        $size = $muted ? '13px' : '15px';
        $color = $muted ? '#6b7280' : '#374151';
        return '<p style="margin:0 0 18px;font-size:' . $size . ';line-height:1.7;color:' . $color . ';text-align:' . $align . ';">' . $html . '</p>';
    }

    public function highlight(string $value, string $color = '#2563eb'): string
    {
        return '<span style="color:' . $color . ';">' . self::e($value) . '</span>';
    }

    public function button(string $href, string $label, string $tone = 'blue'): string
    {
        $colors = ['blue' => ['#2563eb', '#3b82f6'], 'red' => ['#dc2626', '#ef4444'], 'green' => ['#16a34a', '#22c55e']][$tone] ?? ['#2563eb', '#3b82f6'];
        $href = self::e($href);
        return '<table role="presentation" align="center" cellspacing="0" cellpadding="0" border="0" style="margin:26px auto;"><tr>'
            . '<td align="center" bgcolor="' . $colors[0] . '" style="border-radius:14px;background-color:' . $colors[0] . ';background-image:linear-gradient(90deg,' . $colors[1] . ',' . $colors[0] . ');box-shadow:0 10px 22px rgba(37,99,235,.25);">'
            . '<a href="' . $href . '" target="_blank" style="display:inline-block;padding:15px 34px;font-family:' . self::FONT . ';font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:14px;">' . self::e($label) . '</a>'
            . '</td></tr></table>';
    }

    /** Encadré coloré ; $html doit déjà être échappé. */
    public function callout(string $html, string $tone = 'blue'): string
    {
        [$fg, $bg] = self::tone($tone);
        return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;"><tr>'
            . '<td bgcolor="' . $bg . '" style="background-color:' . $bg . ';border:1.5px dashed ' . $fg . ';border-radius:16px;padding:16px 18px;font-size:14px;line-height:1.65;color:#1f2937;">' . $html . '</td>'
            . '</tr></table>';
    }

    /** Liste « étiquette : valeur » ; les valeurs sont échappées ici. */
    public function details(array $rows): string
    {
        $html = '';
        foreach ($rows as $label => $value) {
            $html .= '<tr><td valign="top" style="padding:6px 12px 6px 0;width:34%;font-size:13px;color:#6b7280;white-space:nowrap;">' . self::e($label) . '</td>'
                . '<td valign="top" style="padding:6px 0;font-size:14px;font-weight:600;color:#111827;word-break:break-word;">' . self::e((string) $value) . '</td></tr>';
        }
        return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;"><tr>'
            . '<td bgcolor="#f8fafc" style="background-color:#f8fafc;border:1px solid #e5e7eb;border-radius:16px;padding:14px 18px;">'
            . '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">' . $html . '</table></td></tr></table>';
    }

    /** Liste à puces façon doodle ; chaque élément : [titre, description] déjà sûrs. */
    public function features(array $items): string
    {
        $dots = ['#3b82f6', '#eab308', '#ef4444', '#0ea5e9', '#22c55e', '#a855f7'];
        $html = '';
        foreach (array_values($items) as $i => [$title, $text]) {
            $c = $dots[$i % count($dots)];
            $html .= '<tr><td valign="top" width="26" style="width:26px;padding:8px 0;"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background-color:' . $c . ';border:2px solid #ffffff;box-shadow:0 0 0 2px ' . $c . ';margin-top:6px;"></span></td>'
                . '<td valign="top" style="padding:8px 0;font-size:14px;line-height:1.55;color:#4b5563;"><strong style="display:block;color:#111827;font-size:15px;">' . $title . '</strong>' . $text . '</td></tr>';
        }
        return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0 4px;">' . $html . '</table>';
    }

    /** Message libre (admin, contact) : texte brut converti en HTML sûr. */
    public function message(string $plain): string
    {
        return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;"><tr>'
            . '<td bgcolor="#f8fafc" style="background-color:#f8fafc;border:1px solid #e5e7eb;border-left:4px solid #3b82f6;border-radius:0 16px 16px 0;padding:18px 20px;font-size:15px;line-height:1.75;color:#1f2937;">'
            . nl2br(self::e($plain)) . '</td></tr></table>';
    }

    public function link(string $url): string
    {
        $safe = self::e($url);
        return $this->text('Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br><a href="' . $safe . '" style="color:#2563eb;font-size:12px;word-break:break-all;">' . $safe . '</a>', 'left', true);
    }

    public function signature(string $before = ''): string
    {
        return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:26px;">'
            . '<tr><td height="1" style="height:1px;line-height:1px;font-size:1px;border-top:2px dotted #e5e7eb;">&nbsp;</td></tr>'
            . '<tr><td align="center" style="padding-top:18px;font-size:13px;line-height:1.7;color:#6b7280;">' . $before
            . '<strong style="color:#111827;">L’équipe LaughTube</strong></td></tr></table>';
    }

    private static function tone(string $tone): array
    {
        return [
            'blue' => ['#2563eb', '#eff6ff'],
            'yellow' => ['#ca8a04', '#fefce8'],
            'red' => ['#dc2626', '#fef2f2'],
            'green' => ['#16a34a', '#f0fdf4'],
            'amber' => ['#d97706', '#fffbeb'],
        ][$tone] ?? ['#2563eb', '#eff6ff'];
    }
}
