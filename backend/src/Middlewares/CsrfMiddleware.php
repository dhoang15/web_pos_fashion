<?php
declare(strict_types=1);

namespace App\Middlewares;

use App\Core\ApiException;

final class CsrfMiddleware
{
    public static function validate(string $method, ?string $token): void
    {
        if (in_array(strtoupper($method), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }
        $expected = $_SESSION['csrf_token'] ?? '';
        if (!is_string($token) || $token === '' || !is_string($expected) || $expected === '' || !hash_equals($expected, $token)) {
            throw new ApiException('CSRF token không hợp lệ hoặc đã hết hạn. Tải lại trang và thử lại.', 403, 'CSRF_TOKEN_MISMATCH');
        }
    }
}
