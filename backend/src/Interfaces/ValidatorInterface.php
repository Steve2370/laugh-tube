<?php

namespace App\Interfaces;

interface ValidatorInterface
{
    public function validate(mixed $value): bool;
    public function getError(): ?string;
}