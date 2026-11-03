<?php
declare(strict_types=1);

namespace App\Middlewares;

use App\Core\ApiException;
use App\Core\Database;

final class AuthMiddleware
{
    public static function requireUser(): array
    {
        $userId = filter_var($_SESSION['user_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$userId) {
            throw new ApiException('Vui lòng đăng nhập để tiếp tục.', 401, 'UNAUTHENTICATED');
        }
        $statement = Database::connection()->prepare('SELECT role, status, is_first_login FROM users WHERE id = :id LIMIT 1');
        $statement->execute(['id' => $userId]);
        $user = $statement->fetch();
        if (!$user || $user['status'] !== 'active') {
            $_SESSION = [];
            throw new ApiException('Tài khoản không còn hoạt động. Vui lòng đăng nhập lại.', 401, 'UNAUTHENTICATED');
        }
        $_SESSION['role'] = $user['role'];
        $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
        if ((int)$user['is_first_login'] === 1 && !in_array($path, ['/api/auth/me', '/api/auth/logout', '/api/auth/first-login'], true)) {
            throw new ApiException('Bạn cần đổi mật khẩu lần đầu trước khi sử dụng ứng dụng.', 403, 'PASSWORD_CHANGE_REQUIRED');
        }
        return ['id' => $userId, 'role' => $user['role']];
    }
}