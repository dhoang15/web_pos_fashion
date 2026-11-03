<?php
declare(strict_types=1);

use App\Controllers\AuthController;
use App\Controllers\CategoryController;
use App\Controllers\CustomerController;
use App\Controllers\OrderController;
use App\Controllers\ProductController;
use App\Controllers\ReportController;
use App\Controllers\SettingController;
use App\Controllers\UserController;
use App\Core\Router;

$router = new Router();
$handler = static function (string $class, string $method): callable {
    return static function ($request) use ($class, $method): void {
        $controller = new $class();
        $controller->$method($request);
    };
};

$router->add('GET', '/api/auth/csrf-token', $handler(AuthController::class, 'csrfToken'), false);
$router->add('POST', '/api/auth/login', $handler(AuthController::class, 'login'), false);
$router->add('POST', '/api/auth/invitations/validate', $handler(AuthController::class, 'validateInvitation'), false);
$router->add('POST', '/api/auth/logout', $handler(AuthController::class, 'logout'));
$router->add('GET', '/api/auth/me', $handler(AuthController::class, 'me'));
$router->add('POST', '/api/auth/first-login', $handler(AuthController::class, 'firstLogin'));
$router->add('POST', '/api/auth/change-password', $handler(AuthController::class, 'changePassword'));
$router->add('PUT', '/api/auth/profile', $handler(AuthController::class, 'updateProfile'));
$router->add('POST', '/api/auth/profile', $handler(AuthController::class, 'updateProfile'));

$router->add('GET', '/api/categories', $handler(CategoryController::class, 'index'));
$router->add('POST', '/api/categories', $handler(CategoryController::class, 'create'), true, ['admin']);
$router->add('PUT', '/api/categories/{id}', $handler(CategoryController::class, 'update'), true, ['admin']);
$router->add('DELETE', '/api/categories/{id}', $handler(CategoryController::class, 'delete'), true, ['admin']);

$router->add('GET', '/api/products', $handler(ProductController::class, 'index'));
$router->add('POST', '/api/products', $handler(ProductController::class, 'create'), true, ['admin']);
$router->add('PUT', '/api/products/{id}', $handler(ProductController::class, 'update'), true, ['admin']);
$router->add('POST', '/api/products/{id}', $handler(ProductController::class, 'update'), true, ['admin']);
$router->add('DELETE', '/api/products/{id}', $handler(ProductController::class, 'delete'), true, ['admin']);

$router->add('GET', '/api/customers', $handler(CustomerController::class, 'index'));
$router->add('GET', '/api/customers/lookup', $handler(CustomerController::class, 'lookup'));
$router->add('GET', '/api/customers/{id}/orders', $handler(OrderController::class, 'customerOrders'));

$router->add('GET', '/api/orders', $handler(OrderController::class, 'index'));
$router->add('POST', '/api/orders', $handler(OrderController::class, 'create'));
$router->add('GET', '/api/orders/{id}', $handler(OrderController::class, 'show'));
$router->add('PUT', '/api/orders/{id}', $handler(OrderController::class, 'update'));

$router->add('GET', '/api/reports/sales', $handler(ReportController::class, 'sales'));
$router->add('GET', '/api/users', $handler(UserController::class, 'index'), true, ['admin']);
$router->add('POST', '/api/users', $handler(UserController::class, 'create'), true, ['admin']);
$router->add('PUT', '/api/users/{id}/status', $handler(UserController::class, 'updateStatus'), true, ['admin']);
$router->add('POST', '/api/users/{id}/resend-invitation', $handler(UserController::class, 'resendInvitation'), true, ['admin']);

$router->add('GET', '/api/store_settings', $handler(SettingController::class, 'getStoreSettings'));
$router->add('PUT', '/api/store_settings', $handler(SettingController::class, 'updateStoreSettings'), true, ['admin']);
$router->add('GET', '/api/payment_qrcodes', $handler(SettingController::class, 'paymentQrcodes'));
$router->add('POST', '/api/payment_qrcodes', $handler(SettingController::class, 'createPaymentQrcode'), true, ['admin']);
$router->add('PUT', '/api/payment_qrcodes/{id}', $handler(SettingController::class, 'updatePaymentQrcode'), true, ['admin']);

return $router;
