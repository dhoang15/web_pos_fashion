<?php
declare(strict_types=1);

namespace App\Core;

use App\Middlewares\AuthMiddleware;
use App\Middlewares\RoleMiddleware;

final class Router
{
    private array $routes = [];

    public function add(string $method, string $pattern, callable $handler, bool $auth = true, array $roles = []): void
    {
        $names = [];
        $regex = preg_replace_callback('/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/', static function ($match) use (&$names) {
            $names[] = $match[1];
            return '([^/]+)';
        }, $pattern);
        $this->routes[] = [strtoupper($method), '#^' . $regex . '/?$#', $names, $handler, $auth, $roles];
    }

    public function dispatch(Request $request): void
    {
        foreach ($this->routes as [$method, $regex, $names, $handler, $auth, $roles]) {
            if ($method !== $request->method() || !preg_match($regex, $request->path(), $matches)) {
                continue;
            }
            array_shift($matches);
            $params = [];
            foreach ($names as $index => $name) {
                $params[$name] = rawurldecode($matches[$index]);
            }
            $request->setRouteParams($params);
            if ($auth) {
                AuthMiddleware::requireUser();
            }
            if ($roles) {
                RoleMiddleware::requireAny($roles);
            }
            $handler($request);
            return;
        }
        throw new ApiException('Không tìm thấy API ' . $request->path() . '.', 404, 'NOT_FOUND');
    }
}