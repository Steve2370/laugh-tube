<?php

namespace App\Interfaces;

interface EmailProviderInterface
{
    public function sendEmail(string $to, string $subject, string $body, bool $isHtml = true, ?string $replyTo = null): bool;
    public function getLastError(): ?string;
}