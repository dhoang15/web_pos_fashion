<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiException;
use App\Core\Request;
use App\Core\SmtpMailer;

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
        $temporaryPassword = $this->temporaryPassword();
        $username = strstr($email, '@', true);
        $token = bin2hex(random_bytes(32));
        $userId = 0;
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
            $userId = (int)$this->model->lastInsertId();
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

        $this->sendInvitationOrFail($userId, $email, $username, $token, $temporaryPassword);
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
        $temporaryPassword = $this->temporaryPassword();
        $token = bin2hex(random_bytes(32));
        $this->model->beginTransaction();
        try {
            $this->execute(
                'UPDATE users SET password = :password, login_token = :token, token_time = NOW(), status = "active" WHERE id = :id',
                ['password' => password_hash($temporaryPassword, PASSWORD_DEFAULT), 'token' => hash('sha256', $token), 'id' => $user['id']]
            );
            $this->model->commit();
        } catch (\Throwable $error) {
            if ($this->model->inTransaction()) {
                $this->model->rollBack();
            }
            throw $error;
        }
        $this->sendInvitationOrFail((int)$user['id'], (string)$user['email'], (string)$user['username'], $token, $temporaryPassword);
        $this->ok(['message' => 'Đã gửi lại email mời đăng nhập.']);
    }

    private function sendInvitationOrFail(int $userId, string $email, string $username, string $token, string $temporaryPassword): void
    {
        try {
            $this->sendInvitation($email, $username, $token, $temporaryPassword);
        } catch (ApiException $error) {
            throw new ApiException(
                'Tài khoản đã được lưu nhưng email mời chưa gửi được: ' . $error->getMessage() .
                    ' Hãy xử lý lỗi cấu hình ở trên rồi dùng nút gửi lại liên kết.',
                $error->status,
                'INVITATION_EMAIL_FAILED',
                ['user_id' => $userId, 'cause' => $error->errorCode]
            );
        }
    }

    private function sendInvitation(string $email, string $username, string $token, string $temporaryPassword): void
    {
        $origin = getenv('APP_URL') ?: '';
        $originParts = $origin === '' ? false : parse_url($origin);
        $localHosts = ['localhost', '127.0.0.1', '::1'];
        $isLocalHttp = is_array($originParts) &&
            ($originParts['scheme'] ?? '') === 'http' &&
            in_array(strtolower((string)($originParts['host'] ?? '')), $localHosts, true);
        $isHttps = is_array($originParts) && ($originParts['scheme'] ?? '') === 'https';
        if (!is_array($originParts) || !filter_var($origin, FILTER_VALIDATE_URL) ||
            (!$isHttps && !$isLocalHttp) || isset($originParts['user']) || isset($originParts['pass']) ||
            isset($originParts['query']) || isset($originParts['fragment'])) {
            throw new ApiException('Cấu hình APP_URL không hợp lệ.', 503, 'APP_URL_NOT_CONFIGURED');
        }
        $link = rtrim($origin, '/') . '/pages/auth/login.html#invite=' . rawurlencode($token);
        $body = "Xin chào {$username},\n\n";
        $body .= "Quản trị viên đã tạo tài khoản B'TRIPLE POS cho bạn.\n";
        $body .= "Mật khẩu tạm thời (MSSV trưởng nhóm): {$temporaryPassword}\n";
        $body .= "Hãy đổi mật khẩu ngay sau lần đăng nhập đầu tiên.\n";
        $body .= "Mở liên kết dưới đây trong vòng 1 phút và nhập tên đăng nhập cùng mật khẩu tạm thời:\n\n";
        $body .= $link . "\n\n";
        $body .= "Liên kết chỉ dùng một lần. Nếu đã hết hạn, hãy yêu cầu quản trị viên gửi lại lời mời.\n";
        SmtpMailer::send($email, "Lời mời tham gia B'TRIPLE POS", $body);
    }

    private function temporaryPassword(): string
    {
        $password = trim((string)(getenv('STAFF_TEMP_PASSWORD') ?: ''));
        if ($password === '' || strlen($password) > 72) {
            throw new ApiException('Cấu hình STAFF_TEMP_PASSWORD chưa có hoặc vượt quá 72 byte.', 503, 'TEMPORARY_PASSWORD_NOT_CONFIGURED');
        }
        return $password;
    }
}
