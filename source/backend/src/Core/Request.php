<?php
declare(strict_types=1);

namespace App\Core;

final class Request
{
    private array $routeParams = [];
    private ?array $cachedInput = null;

    public function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public function path(): string
    {
        return parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    }

    public function input(): array
    {
        if ($this->cachedInput !== null) {
            return $this->cachedInput;
        }
        if (!empty($_POST)) {
            return $this->cachedInput = $_POST;
        }
        $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
        if (strpos($contentType, 'application/json') !== false) {
            $decoded = json_decode(file_get_contents('php://input') ?: '', true);
            if (!is_array($decoded)) {
                throw new ApiException('Dữ liệu JSON không hợp lệ.', 400, 'INVALID_JSON');
            }
            return $this->cachedInput = $decoded;
        }
        return $this->cachedInput = [];
    }

    public function query(): array
    {
        return $_GET;
    }

    public function header(string $name): ?string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        if (isset($_SERVER[$key])) {
            return trim((string)$_SERVER[$key]);
        }
        if (strtolower($name) === 'content-type' && isset($_SERVER['CONTENT_TYPE'])) {
            return trim((string)$_SERVER['CONTENT_TYPE']);
        }
        return null;
    }

    public function file(string $name): ?array
    {
        $file = $_FILES[$name] ?? null;
        return is_array($file) && ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_NO_FILE ? $file : null;
    }

    public function setRouteParams(array $params): void
    {
        $this->routeParams = $params;
    }

    public function param(string $name): ?string
    {
        return isset($this->routeParams[$name]) ? (string)$this->routeParams[$name] : null;
    }
}