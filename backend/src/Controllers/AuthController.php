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

        if (!empty($user['is_first_login']) && $user['role'] !== 'admin') {
            $token = trim((string)($input['invitation_token'] ?? ''));
            $storedToken = (string)($user['login_token'] ?? '');
            $tokenTime = $user['token_time'] ? strtotime((string)$user['token_time']) : false;
            if ($token === '') {
                throw new ApiException('Tài khoản cần đăng nhập từ liên kết email còn hiệu lực 1 phút.', 403, 'INVITE_LINK_REQUIRED');
            }
            if ($storedToken === '' || $tokenTime === false || time() - $tokenTime < 0 || time() - $tokenTime > 60 ||
                (!hash_equals($storedToken, hash('sha256', $token)) && !hash_equals($storedToken, $token))) {
                throw new ApiException('Liên kết đăng nhập không hợp lệ hoặc đã hết hạn.', 403, 'INVITATION_EXPIRED');
            }
        }

        session_regenerate_id(true);
        $_SESSION['user_id'] = (int)$user['id'];
        $_SESSION['role'] = $user['role'];
        $this->ok(['user' => $this->publicUser($user)]);
    }

    public function validateInvitation(Request $request): void
    {
        $token = trim((string)($request->input()['token'] ?? ''));
        if ($token === '' || strlen($token) > 256) {
            $this->ok(['valid' => false]);
            return;
        }
        $users = $this->rows(
            "SELECT login_token, token_time FROM users WHERE is_first_login = 1 AND status = 'active' AND login_token IS NOT NULL"
        );
        foreach ($users as $user) {
            $created = $user['token_time'] ? strtotime((string)$user['token_time']) : false;
            if ($created !== false && time() - $created >= 0 && time() - $created <= 60 &&
                (hash_equals((string)$user['login_token'], hash('sha256', $token)) || hash_equals((string)$user['login_token'], $token))) {
                $this->ok(['valid' => true]);
                return;
            }
        }
        $this->ok(['valid' => false]);
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
        if (strlen($password) < 8 || $password !== (string)($input['password_confirmation'] ?? '')) {
            throw new ApiException('Mật khẩu mới cần ít nhất 8 ký tự và phải khớp xác nhận.', 422, 'VALIDATION_ERROR', ['password' => ['Mật khẩu không hợp lệ.']]);
        }
        $user = $this->row('SELECT id, is_first_login FROM users WHERE id = :id', ['id' => $this->currentUserId()]);
        if (!$user || !(int)$user['is_first_login']) {
            throw new ApiException('Không cần đổi mật khẩu lần đầu cho tài khoản này.', 409, 'FIRST_LOGIN_NOT_REQUIRED');
        }
        $this->execute(
            'UPDATE users SET password = :password, is_first_login = 0, login_token = NULL, token_time = NULL WHERE id = :id',
            ['password' => password_hash($password, PASSWORD_DEFAULT), 'id' => $user['id']]
        );
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
        if (strlen($password) < 8 || $password !== (string)($input['password_confirmation'] ?? '')) {
            throw new ApiException('Mật khẩu mới cần ít nhất 8 ký tự và phải khớp xác nhận.', 422, 'VALIDATION_ERROR', ['password' => ['Mật khẩu không hợp lệ.']]);
        }
        $this->execute('UPDATE users SET password = :password, is_first_login = 0 WHERE id = :id', [
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'id' => $user['id'],
        ]);
        $this->ok(['message' => 'Đã đổi mật khẩu.']);
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