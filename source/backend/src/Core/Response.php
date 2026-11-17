<?php
declare(strict_types=1);

namespace App\Core;

final class Response
{
    public static function json($data = null, int $status = 200): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE);
    }

    public static function error(ApiException $error): void
    {
        self::json([
            'error' => [
                'code' => $error->errorCode,
                'message' => $error->getMessage(),
                'details' => (object)$error->details,
            ],
        ], $error->status);
    }
}