<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiException;
use App\Core\Request;
use App\Core\Response;
use App\Models\Model;

abstract class Controller
{
    protected Model $model;

    public function __construct()
    {
        $this->model = new Model();
    }

    protected function ok($data = null, int $status = 200): void
    {
        Response::json(['data' => $data], $status);
    }

    protected function rows(string $sql, array $params = []): array
    {
        return $this->model->rows($sql, $params);
    }

    protected function row(string $sql, array $params = []): ?array
    {
        return $this->model->row($sql, $params);
    }

    protected function execute(string $sql, array $params = []): int
    {
        return $this->model->execute($sql, $params);
    }

    protected function required(array $input, string $key, int $maxLength = 255): string
    {
        $value = trim((string)($input[$key] ?? ''));
        if ($value === '' || mb_strlen($value) > $maxLength) {
            throw new ApiException('Trường ' . $key . ' là bắt buộc và tối đa ' . $maxLength . ' ký tự.', 422, 'VALIDATION_ERROR', [$key => ['Giá trị không hợp lệ.']]);
        }
        return $value;
    }

    protected function currentUserId(): int
    {
        return (int)($_SESSION['user_id'] ?? 0);
    }

    protected function publicUser(array $user): array
    {
        unset($user['password'], $user['login_token'], $user['token_time']);
        if (isset($user['first_name'], $user['last_name'])) {
            $user['name'] = trim($user['first_name'] . ' ' . $user['last_name']);
        }
        if (!empty($user['avatar']) && $user['avatar'] !== 'default-avatar.png' && strpos($user['avatar'], '/') !== 0) {
            $user['avatar'] = '/uploads/' . rawurlencode(basename($user['avatar']));
        }
        return $user;
    }

    protected function uploadImage(Request $request, string $field, array $mimeTypes, int $maxBytes = 5242880): ?string
    {
        $file = $request->file($field);
        if ($file === null) {
            return null;
        }
        if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK || ($file['size'] ?? 0) > $maxBytes || !is_uploaded_file($file['tmp_name'])) {
            throw new ApiException('Tệp tải lên không hợp lệ hoặc vượt quá 5 MB.', 422, 'INVALID_UPLOAD');
        }
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        $extensions = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'];
        if (!isset($extensions[$mime]) || !in_array($mime, $mimeTypes, true) || @getimagesize($file['tmp_name']) === false) {
            throw new ApiException('Chỉ chấp nhận ảnh PNG, JPG hoặc WebP hợp lệ.', 422, 'INVALID_IMAGE');
        }
        $config = require dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'app.php';
        $directory = $config['upload_dir'];
        if (!is_dir($directory) && !mkdir($directory, 0750, true) && !is_dir($directory)) {
            throw new ApiException('Không thể tạo thư mục lưu tệp tải lên.', 500, 'UPLOAD_STORAGE_ERROR');
        }
        $filename = bin2hex(random_bytes(16)) . '.' . $extensions[$mime];
        if (!move_uploaded_file($file['tmp_name'], $directory . DIRECTORY_SEPARATOR . $filename)) {
            throw new ApiException('Không thể lưu tệp tải lên.', 500, 'UPLOAD_STORAGE_ERROR');
        }
        return $filename;
    }
}
