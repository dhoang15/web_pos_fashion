<?php
declare(strict_types=1);

namespace App\Middlewares;

use App\Core\ApiException;

final class RoleMiddleware
{
    public static function requireAny(array $roles): void
    {
        $user = AuthMiddleware::requireUser();
        if (!in_array($user['role'], $roles, true)) {
            throw new ApiException('Bạn không có quyền thực hiện thao tác này.', 403, 'FORBIDDEN');
        }
    }
}