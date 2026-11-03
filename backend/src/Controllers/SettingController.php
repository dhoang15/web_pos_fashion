<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiException;
use App\Core\Request;

final class SettingController extends Controller
{
    public function getStoreSettings(Request $request): void
    {
        $settings = [];
        foreach ($this->rows('SELECT setting_key, setting_value FROM store_settings ORDER BY setting_key') as $setting) {
            $settings[$setting['setting_key']] = $setting['setting_value'];
        }
        $this->ok(['settings' => $settings]);
    }

    public function updateStoreSettings(Request $request): void
    {
        $input = $request->input();
        $allowed = [
            'store_name' => 'text',
            'store_address' => 'text',
            'store_phone' => 'text',
            'store_email' => 'text',
            'store_tax_code' => 'text',
            'order_prefix' => 'text',
            'tax_rate' => 'number',
            'receipt_thank_you' => 'textarea',
            'return_policy_days' => 'number',
        ];
        foreach ($allowed as $key => $type) {
            if (!array_key_exists($key, $input)) {
                continue;
            }
            $value = trim((string)$input[$key]);
            $maximum = $key === 'return_policy_days' ? 365 : 100;
            if ($type === 'number' && (!is_numeric($value) || (float)$value < 0 || (float)$value > $maximum)) {
                throw new ApiException('Giá trị cài đặt ' . $key . ' không hợp lệ.', 422, 'VALIDATION_ERROR', [$key => ['Giá trị số không hợp lệ.']]);
            }
            if ($key === 'store_email' && $value !== '' && !filter_var($value, FILTER_VALIDATE_EMAIL)) {
                throw new ApiException('Email cửa hàng không hợp lệ.', 422, 'VALIDATION_ERROR', [$key => ['Email không hợp lệ.']]);
            }
            $this->execute(
                'INSERT INTO store_settings (setting_key, setting_value, setting_type) VALUES (:key, :value, :type) ON DUPLICATE KEY UPDATE setting_value = :update_value, setting_type = :update_type',
                ['key' => $key, 'value' => $value, 'type' => $type, 'update_value' => $value, 'update_type' => $type]
            );
        }
        $settings = [];
        foreach ($this->rows('SELECT setting_key, setting_value FROM store_settings ORDER BY setting_key') as $setting) {
            $settings[$setting['setting_key']] = $setting['setting_value'];
        }
        $this->ok(['settings' => $settings]);
    }

    public function paymentQrcodes(Request $request): void
    {
        $query = $request->query();
        $sql = 'SELECT * FROM payment_qrcodes';
        $params = [];
        if (isset($query['is_active']) && (string)$query['is_active'] === '1') {
            $sql .= ' WHERE is_active = 1';
        }
        $sql .= ' ORDER BY is_active DESC, id DESC';
        $codes = $this->rows($sql, $params);
        foreach ($codes as &$code) {
            $code = $this->publicQrCode($code);
        }
        $this->ok($codes);
    }

    public function createPaymentQrcode(Request $request): void
    {
        $input = $request->input();
        $method = trim((string)($input['payment_method'] ?? 'qr_code'));
        if ($method === '' || mb_strlen($method) > 50) {
            throw new ApiException('Phương thức thanh toán QR không hợp lệ.', 422, 'VALIDATION_ERROR');
        }
        $image = $this->uploadImage($request, 'qr_code', ['image/png', 'image/jpeg']);
        if ($image === null) {
            throw new ApiException('Hãy chọn ảnh mã QR PNG hoặc JPG.', 422, 'INVALID_IMAGE');
        }
        $path = '/uploads/' . rawurlencode($image);
        $this->model->beginTransaction();
        try {
            $this->execute('UPDATE payment_qrcodes SET is_active = 0');
            $this->execute(
                'INSERT INTO payment_qrcodes (payment_method, qr_code_path, description, is_active) VALUES (:method, :path, :description, 1)',
                [
                    'method' => $method,
                    'path' => $path,
                    'description' => trim((string)($input['description'] ?? '')) ?: null,
                ]
            );
            $id = (int)$this->model->lastInsertId();
            $this->model->commit();
        } catch (\Throwable $error) {
            if ($this->model->inTransaction()) {
                $this->model->rollBack();
            }
            throw $error;
        }
        $this->ok(['qrcode' => $this->publicQrCode($this->row('SELECT * FROM payment_qrcodes WHERE id = :id', ['id' => $id]))], 201);
    }

    public function updatePaymentQrcode(Request $request): void
    {
        $id = (int)$request->param('id');
        $current = $this->row('SELECT * FROM payment_qrcodes WHERE id = :id', ['id' => $id]);
        if (!$current) {
            throw new ApiException('Không tìm thấy mã QR.', 404, 'QRCODE_NOT_FOUND');
        }
        $input = $request->input();
        $active = filter_var($input['is_active'] ?? $current['is_active'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
        if ($active === null) {
            throw new ApiException('Trạng thái mã QR không hợp lệ.', 422, 'VALIDATION_ERROR');
        }
        $this->model->beginTransaction();
        try {
            if ($active) {
                $this->execute('UPDATE payment_qrcodes SET is_active = 0');
            }
            $this->execute('UPDATE payment_qrcodes SET is_active = :active WHERE id = :id', ['active' => $active ? 1 : 0, 'id' => $id]);
            $this->model->commit();
        } catch (\Throwable $error) {
            if ($this->model->inTransaction()) {
                $this->model->rollBack();
            }
            throw $error;
        }
        $this->ok(['qrcode' => $this->publicQrCode($this->row('SELECT * FROM payment_qrcodes WHERE id = :id', ['id' => $id]))]);
    }

    private function publicQrCode(array $code): array
    {
        if (!empty($code['qr_code_path']) && strpos($code['qr_code_path'], '/') !== 0 && !preg_match('#^https?://#i', $code['qr_code_path'])) {
            $code['qr_code_path'] = '/uploads/' . rawurlencode(basename($code['qr_code_path']));
        }
        return $code;
    }
}