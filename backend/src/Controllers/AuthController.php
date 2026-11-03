<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiException;
use App\Core\Request;

final class AuthController extends Controller
{
    public function csrfToken(Request $request): void
    {
        if (empty($_SESSION['csrf_token'])) {
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        }
        $this->ok(['csrf_token' => $_SESSION['csrf_token']]);
    }

    public function login(Request $request): void
    {
        $input = $request->input();
        $username = $this->required($input, 'username', 50);
        $password = (string)($input['password'] ?? '');
        $user = $this->row("SELECT * FROM users WHERE username = :username OR email = :email LIMIT 1", ['username' => $username, 'email' => $username]);
        if (!$user || $user['status'] !== 'active' || !password_verify($password, $user['password'])) {
            throw new ApiException('Tên đăng nhập hoặc mật khẩu không chính xác.', 401, 'INVALID_CREDENTIALS');
        }
        if ((int)$user['is_first_login'] === 1 && $user['role'] !== 'admin') {
            throw new ApiException('Nhân viên mới cần tạo mật khẩu từ liên kết mời trong email trước khi đăng nhập.', 403, 'INVITATION_REQUIRED');
        }

        session_regenerate_id(true);
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['user_id'] = (int)$user['id'];
        $_SESSION['role'] = $user['role'];
        if ((int)$user['is_first_login'] === 1) {
            $_SESSION['is_first_login'] = true;
        } else {
            unset($_SESSION['is_first_login']);
        }
        $this->ok(['user' => $this->publicUser($user)]);
    }

    public function completeInvitation(Request $request): void
    {
        $input = $request->input();
        $token = trim((string)($input['token'] ?? ''));
        $password = (string)($input['password'] ?? '');
        if (!preg_match('/^[a-f0-9]{64}$/i', $token)) {
            throw new ApiException('Liên kết mời không hợp lệ hoặc đã hết hạn.', 422, 'INVITATION_EXPIRED');
        }
        $this->validateNewPassword($password, (string)($input['password_confirmation'] ?? ''));

        $this->model->beginTransaction();
        try {
            $user = $this->row(
                "SELECT id, username, email, role, first_name, last_name, phone, avatar, status, is_first_login " .
                "FROM users WHERE login_token = :token AND is_first_login = 1 AND status = 'active' " .
                'AND token_time > DATE_SUB(NOW(), INTERVAL 1 MINUTE) AND token_time <= NOW() LIMIT 1 FOR UPDATE',
                ['token' => hash('sha256', $token)]
            );
            if (!$user) {
                throw new ApiException('Liên kết mời không hợp lệ hoặc đã hết hạn. Hãy yêu cầu quản trị viên gửi lại.', 403, 'INVITATION_EXPIRED');
            }
            $this->execute(
                "UPDATE users SET password = :password, is_first_login = 0, login_token = NULL, token_time = NULL " .
                "WHERE id = :id AND is_first_login = 1 AND login_token = :token",
                [
                    'password' => password_hash($password, PASSWORD_DEFAULT),
                    'id' => $user['id'],
                    'token' => hash('sha256', $token),
                ]
            );
            $this->model->commit();
        } catch (\Throwable $error) {
            if ($this->model->inTransaction()) {
                $this->model->rollBack();
            }
            throw $error;
        }

        session_regenerate_id(true);
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
        $_SESSION['user_id'] = (int)$user['id'];
        $_SESSION['role'] = $user['role'];
        unset($_SESSION['is_first_login']);
        $user['is_first_login'] = 0;
        $this->ok(['user' => $this->publicUser($user)]);
    }

    public function logout(Request $request): void
    {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        $this->ok(['message' => 'Đã đăng xuất.']);
    }

    public function me(Request $request): void
    {
        $user = $this->row('SELECT * FROM users WHERE id = :id LIMIT 1', ['id' => $this->currentUserId()]);
        if (!$user || $user['status'] !== 'active') {
            $_SESSION = [];
            throw new ApiException('Phiên đăng nhập không còn hợp lệ.', 401, 'UNAUTHENTICATED');
        }
        $this->ok(['user' => $this->publicUser($user)]);
    }

    public function firstLogin(Request $request): void
    {
        $input = $request->input();
        $password = (string)($input['password'] ?? '');
        $this->validateNewPassword($password, (string)($input['password_confirmation'] ?? ''));
        $user = $this->row('SELECT id, is_first_login FROM users WHERE id = :id', ['id' => $this->currentUserId()]);
        if (!$user || !(int)$user['is_first_login']) {
            throw new ApiException('Không cần đổi mật khẩu lần đầu cho tài khoản này.', 409, 'FIRST_LOGIN_NOT_REQUIRED');
        }
        $this->execute(
            'UPDATE users SET password = :password, is_first_login = 0, login_token = NULL, token_time = NULL WHERE id = :id',
            ['password' => password_hash($password, PASSWORD_DEFAULT), 'id' => $user['id']]
        );
        unset($_SESSION['is_first_login']);
        $this->ok(['message' => 'Đã cập nhật mật khẩu.']);
    }

    public function changePassword(Request $request): void
    {
        $input = $request->input();
        $user = $this->row('SELECT id, password FROM users WHERE id = :id', ['id' => $this->currentUserId()]);
        if (!$user || !password_verify((string)($input['current_password'] ?? ''), $user['password'])) {
            throw new ApiException('Mật khẩu hiện tại không chính xác.', 422, 'INVALID_CURRENT_PASSWORD');
        }
        $password = (string)($input['password'] ?? '');
        $this->validateNewPassword($password, (string)($input['password_confirmation'] ?? ''));
        $this->execute('UPDATE users SET password = :password, is_first_login = 0 WHERE id = :id', [
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'id' => $user['id'],
        ]);
        $this->ok(['message' => 'Đã đổi mật khẩu.']);
    }

    private function validateNewPassword(string $password, string $confirmation): void
    {
        if (mb_strlen($password) < 12 || strlen($password) > 72 || $password !== $confirmation) {
            throw new ApiException('Mật khẩu cần ít nhất 12 ký tự (tối đa 72 byte) và phải khớp xác nhận.', 422, 'VALIDATION_ERROR', ['password' => ['Mật khẩu không hợp lệ.']]);
        }
    }

    public function updateProfile(Request $request): void
    {
        $input = $request->input();
        $name = $this->required($input, 'name', 100);
        $parts = preg_split('/\s+/u', $name, -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $firstName = array_shift($parts) ?? '';
        $lastName = implode(' ', $parts);
        if (mb_strlen($firstName) > 50 || mb_strlen($lastName) > 50) {
            throw new ApiException('Họ và tên mỗi phần tối đa 50 ký tự.', 422, 'VALIDATION_ERROR');
        }
        $phone = trim((string)($input['phone'] ?? ''));
        if ($phone !== '' && !preg_match('/^(?:\+84|0)[0-9]{9}$/', $phone)) {
            throw new ApiException('Số điện thoại không hợp lệ.', 422, 'VALIDATION_ERROR', ['phone' => ['Số điện thoại không hợp lệ.']]);
        }
        $avatar = $this->uploadImage($request, 'avatar', ['image/png', 'image/jpeg', 'image/webp']);
        $params = ['first_name' => $firstName, 'last_name' => $lastName, 'phone' => $phone !== '' ? $phone : null, 'id' => $this->currentUserId()];
        $sql = 'UPDATE users SET first_name = :first_name, last_name = :last_name, phone = :phone';
        if ($avatar !== null) {
            $sql .= ', avatar = :avatar';
            $params['avatar'] = $avatar;
        }
        $sql .= ' WHERE id = :id';
        $this->execute($sql, $params);
        $user = $this->row('SELECT * FROM users WHERE id = :id', ['id' => $this->currentUserId()]);
        $this->ok(['user' => $this->publicUser($user)]);
    }
}