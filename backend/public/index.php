<?php
declare(strict_types=1);

use App\Core\ApiException;
use App\Core\Request;
use App\Core\Response;
use App\Middlewares\CsrfMiddleware;

require dirname(__DIR__) . DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR . 'bootstrap.php';

$appConfig = require dirname(__DIR__) . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'app.php';
session_name($appConfig['session_name']);
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => $appConfig['session_secure'],
    'httponly' => true,
    'samesite' => 'Lax',
]);
if (!session_start()) {
    Response::json(['error' => ['code' => 'SESSION_UNAVAILABLE', 'message' => 'Không thể khởi tạo phiên làm việc.']], 500);
    exit;
}

try {
    $request = new Request();
    if ($request->method() === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
    CsrfMiddleware::validate($request->method(), $request->header('X-CSRF-TOKEN'));
    $router = require dirname(__DIR__) . DIRECTORY_SEPARATOR . 'routes' . DIRECTORY_SEPARATOR . 'api.php';
    $router->dispatch($request);
} catch (ApiException $error) {
    Response::error($error);
} catch (Throwable $error) {
    error_log((string)$error);
    Response::json(['error' => ['code' => 'INTERNAL_ERROR', 'message' => 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại.']], 500);
}