<?php
namespace App\Services;
use App\Interfaces\EmailProviderInterface;
class GmailSmtpEmailProvider implements EmailProviderInterface
{
    private string $username;
    private string $password;
    private string $from;
    private ?string $lastError = null;

    public function __construct(array $config)
    {
        $this->username = $config['smtp_username'];
        $this->password = $config['smtp_password'];
        $this->from = $config['from_email'];
    }

    public function sendEmail(string $to, string $subject, string $body, bool $isHtml = true, ?string $replyTo = null): bool
    {
        $headers = [
            'MIME-Version: 1.0',
            'Content-Type: ' . ($isHtml ? 'text/html; charset=UTF-8' : 'text/plain; charset=UTF-8'),
            'From: Laugh Tube <' . $this->username . '>',
            'Reply-To: ' . ($replyTo ?? $this->username),
        ];

        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
            ]
        ]);

        try {
            $smtp = stream_socket_client('ssl://smtp.gmail.com:465', $errno, $errstr, 30, STREAM_CLIENT_CONNECT, $context);
            if (!$smtp) {
                $this->lastError = "Connection failed: $errstr ($errno)";
                return false;
            }

            $this->read($smtp);
            $this->send($smtp, "EHLO laughtube.ca");
            $this->read($smtp);
            $this->send($smtp, "AUTH LOGIN");
            $this->read($smtp);
            $this->send($smtp, base64_encode($this->username));
            $this->read($smtp);
            $this->send($smtp, base64_encode($this->password));
            $response = $this->read($smtp);

            if (strpos($response, '235') === false) {
                $this->lastError = "Auth failed: $response";
                fclose($smtp);
                return false;
            }

            $this->send($smtp, "MAIL FROM:<{$this->username}>");
            $this->read($smtp);
            $this->send($smtp, "RCPT TO:<{$to}>");
            $this->read($smtp);
            $this->send($smtp, "DATA");
            $this->read($smtp);

            $message = implode("\r\n", $headers) . "\r\n";
            $message .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
            $message .= "To: {$to}\r\n\r\n";
            $message .= $body . "\r\n.";
            $this->send($smtp, $message);
            $this->read($smtp);
            $this->send($smtp, "QUIT");
            fclose($smtp);
            return true;

        } catch (\Exception $e) {
            $this->lastError = $e->getMessage();
            return false;
        }
    }

    private function send($smtp, string $cmd): void
    {
        fwrite($smtp, $cmd . "\r\n");
    }

    private function read($smtp): string
    {
        $response = '';
        while ($line = fgets($smtp, 515)) {
            $response .= $line;
            if ($line[3] === ' ') break;
        }
        return $response;
    }

    public function getLastError(): ?string
    {
        return $this->lastError;
    }
}