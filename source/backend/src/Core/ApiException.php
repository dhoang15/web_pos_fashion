<?php
declare(strict_types=1);

namespace App\Core;

use RuntimeException;

final class ApiException extends RuntimeException
{
    public int $status;
    public string $errorCode;
    public array $details;

    public function __construct(string $message, int $status = 400, string $errorCode = 'BAD_REQUEST', array $details = [])
    {
        parent::__construct($message);
        $this->status = $status;
        $this->errorCode = $errorCode;
        $this->details = $details;
    }
}