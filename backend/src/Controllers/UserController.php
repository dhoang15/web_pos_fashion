<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiException;
use App\Core\Request;

final class UserController extends Controller
{
    public function index(Request $request): void
    {
        $users = $this->rows(
            'SELECT id, username, email, role, first_name, last_name, phone, avatar, status, is_first_login, created_at ' .
            'FROM users ORDER BY created_at DESC'
        );
        foreach ($users as &$user) {
            $user = $this->publicUser($user);
        }
        $this->ok($users);
    }

    public function create(Request $request): void
    {
        $input = $request->input();
        $firstName = $this->required($input, 'first_name', 50);
        $lastName = $this->required($input, 'last_name', 50);
        $email = strtolower($this->required($input, 'email', 100));
        if (!preg_match('/^[a-z0-9._%+-]+@gmail\.com$/', $email)) {
            throw new ApiException('Email nhân viên phải là địa chỉ Gmail hợp lệ.', 422, 'VALIDATION_ERROR', ['email' => ['Email Gmail không hợp lệ.']]);
        }
        $phone = trim((string)($input['phone'] ?? ''));
        if ($phone !== '' && !preg_match('/^(?:\+84|0)[0-9]{9}$/', $phone)) {
            throw new ApiException('Số điện thoại không hợp lệ.', 422, 'VALIDATION_ERROR', ['phone' => ['Số điện thoại không hợp lệ.']]);
        }
        $username = strstr($email, '@', true);
        $temporaryPassword = bin2hex(random_bytes(6));
        $token = bin2hex(random_bytes(32));
        $this->model->beginTransaction();
        try {
            $this->execute(
                "INSERT INTO users (username, email, password, role, first_name, last_name, phone, status, is_first_login, login_token, token_time) " .
                "VALUES (:username, :email, :password, 'staff', :first_name, :last_name, :phone, 'active', 1, :token, NOW())",
                [
                    'username' => $username,
                    'email' => $email,
                    'password' => password_hash($temporaryPassword, PASSWORD_DEFAULT),
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'phone' => $phone ?: null,
                    'token' => hash('sha256', $token),
                ]
            );
            $this->sendInvitation($email, $username, $temporaryPassword, $token);
            $this->model->commit();
        } catch (\Throwable $error) {
            if ($this->model->inTransaction()) {
                $this->model->rollBack();
            }
            if ($error instanceof \PDOException && (string)$error->getCode() === '23000') {
                throw new ApiException('Tên đăng nhập hoặc email này đã tồn tại.', 409, 'USER_EXISTS');
            }
            throw $error;
        }
        $this->ok(['message' => 'Đã tạo tài khoản và gửi email mời đăng nhập.'], 201);
    }

    public function updateStatus(Request $request): void
    {
        $id = (int)$request->param('id');
        if ($id === $this->currentUserId()) {
            throw new ApiException('Không thể tự thay đổi trạng thái tài khoản đang đăng nhập.', 409, 'SELF_STATUS_CHANGE');
        }
        $user = $this->row('SELECT id, status, role FROM users WHERE id = :id', ['id' => $id]);
        if (!$user) {
            throw new ApiException('Không tìm thấy nhân viên.', 404, 'USER_NOT_FOUND');
        }
        $requested = (string)($request->input()['status'] ?? '');
        if (!in_array($requested, ['active', 'inactive', 'locked'], true)) {
            $requested = $user['status'] === 'active' ? 'locked' : 'active';
        }
        if ($user['role'] === 'admin' && $requested !== 'active') {
            $adminCount = $this->row("SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND status = 'active'");
            if ((int)($adminCount['count'] ?? 0) <= 1) {
                throw new ApiException('Không thể khóa hoặc vô hiệu hóa quản trị viên cuối cùng.', 409, 'LAST_ADMIN');
            }
        }
        $this->execute('UPDATE users SET status = :status WHERE id = :id', ['status' => $requested, 'id' => $id]);
        $this->ok(['status' => $requested]);
    }

    public function resendInvitation(Request $request): void
    {
        $user = $this->row('SELECT * FROM users WHERE id = :id', ['id' => (int)$request->param('id')]);
        if (!$user) {
            throw new ApiException('Không tìm thấy nhân viên.', 404, 'USER_NOT_FOUND');
        }
        if ($user['role'] === 'admin' || !(int)$user['is_first_login']) {
            throw new ApiException('Tài khoản này không cần liên kết kích hoạt.', 409, 'INVITATION_NOT_REQUIRED');
        }
        $temporaryPassword = bin2hex(random_bytes(6));
        $token = bin2hex(random_bytes(32));
        $this->model->beginTransaction();
        try {
            $this->execute(
                'UPDATE users SET password = :password, login_token = :token, token_time = NOW(), status = "active" WHERE id = :id',
                ['password' => password_hash($temporaryPassword, PASSWORD_DEFAULT), 'token' => hash('sha256', $token), 'id' => $user['id']]
            );
            $this->sendInvitation($user['email'], $user['username'], $temporaryPassword, $token);
            $this->model->commit();
        } catch (\Throwable $error) {
            if ($this->model->inTransaction()) {
                $this->model->rollBack();
            }
            throw $error;
        }
        $this->ok(['message' => 'Đã gửi lại email mời đăng nhập.']);
    }

    private function sendInvitation(string $email, string $username, string $password, string $token): void
    {
        $from = getenv('MAIL_FROM') ?: '';
        if ($from === '' || !filter_var($from, FILTER_VALIDATE_EMAIL)) {
            throw new ApiException('Tài khoản đã được tạo nhưng chưa gửi được email: cấu hình MAIL_FROM và dịch vụ mail của PHP trước.', 503, 'MAIL_NOT_CONFIGURED');
        }
        $origin = getenv('APP_URL') ?: '';
        if ($origin === '' || !filter_var($origin, FILTER_VALIDATE_URL)) {
            throw new ApiException('Tài khoản đã được tạo nhưng chưa gửi được email: cấu hình APP_URL trước.', 503, 'APP_URL_NOT_CONFIGURED');
        }
        $link = rtrim($origin, '/') . '/pages/auth/login.html#invite=' . rawurlencode($token);
        $subject = '=?UTF-8?B?' . base64_encode('Lời mời đăng nhập B’TRIPLE POS') . '?=';
        $body = "Tài khoản: {$username}\nMật khẩu tạm thời: {$password}\nLiên kết (có hiệu lực 1 phút): {$link}\nHãy đổi mật khẩu ngay sau lần đăng nhập đầu tiên.";
        $headers = "From: {$from}\r\nContent-Type: text/plain; charset=UTF-8";
        if (!mail($email, $subject, $body, $headers)) {
            throw new ApiException('Tài khoản đã được tạo nhưng máy chủ không gửi được email. Kiểm tra cấu hình mail.', 503, 'MAIL_DELIVERY_FAILED');
        }
    }
}