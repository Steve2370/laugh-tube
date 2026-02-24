<?php

namespace App\Services;

use App\Interfaces\EmailProviderInterface;

class ResendEmailProvider implements EmailProviderInterface
{
    private string $apiKey;
    private string $from;
    private ?string $lastError = null;

    public function __construct(array $config)
    {
        $this->apiKey = $config['resend_api_key'];
        $this->from = $config['from_email'];
    }

    public function sendEmail(string $to, string $subject, string $body, bool $isHtml = true, ?string $replyTo = null): bool
    {
        $payload = [
            'from'    => 'Laugh Tube <' . $this->from . '>',
            'to'      => [$to],
            'subject' => $subject,
            'html'    => $isHtml ? $body : null,
            'text'    => !$isHtml ? $body : strip_tags($body),
        ];

        if ($replyTo) {
            $payload['reply_to'] = $replyTo;
        }

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL            => 'https://api.resend.com/emails',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode($payload),
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . $this->apiKey,
                'Content-Type: application/json',
            ],
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            $this->lastError = $response;
            return false;
        }

        return true;
    }

    public function getLastError(): ?string
    {
        return $this->lastError;
    }
}
