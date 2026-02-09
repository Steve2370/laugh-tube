<?php

namespace App\Utils;

class Router
{
    private array $routes = [];
    private array $middlewares = [];

    public function get(string $pattern, $handler, array $middlewares = []): void
    {
        $this->addRoute('GET', $pattern, $handler, $middlewares);
    }

    public function post(string $pattern, $handler, array $middlewares = []): void
    {
        $this->addRoute('POST', $pattern, $handler, $middlewares);
    }

    public function put(string $pattern, $handler, array $middlewares = []): void
    {
        $this->addRoute('PUT', $pattern, $handler, $middlewares);
    }

    public function delete(string $pattern, $handler, array $middlewares = []): void
    {
        $this->addRoute('DELETE', $pattern, $handler, $middlewares);
    }

    public function any(string $pattern, $handler, array $middlewares = []): void
    {
        $this->addRoute('*', $pattern, $handler, $middlewares);
    }

    public function group(string $prefix, callable $callback): void
    {
        $originalRoutes = $this->routes;
        $this->routes = [];

        call_user_func($callback, $this);

        $newRoutes = $this->routes;
        $this->routes = $originalRoutes;

        foreach ($newRoutes as $route) {
            $route['pattern'] = $prefix . $route['pattern'];
            $this->routes[] = $route;
        }
    }

    public function middleware($middleware): void
    {
        $this->middlewares[] = $middleware;
    }

    private function addRoute(string $method, string $pattern, $handler, array $middlewares = []): void
    {
        $this->routes[] = [
            'method' => $method,
            'pattern' => $pattern,
            'handler' => $handler,
            'middlewares' => $middlewares
        ];
    }

    public function dispatch(string $method, string $uri): void
    {
        foreach ($this->routes as $route) {
            if ($route['method'] !== '*' && $route['method'] !== $method) {
                continue;
            }

            if (preg_match($route['pattern'], $uri, $matches)) {
                array_shift($matches);

                foreach ($this->middlewares as $middleware) {
                    call_user_func($middleware);
                }

                foreach ($route['middlewares'] as $middleware) {
                    call_user_func($middleware);
                }

                call_user_func_array($route['handler'], $matches);
                return;
            }
        }

        JsonResponse::notFound(['error' => 'Route non trouvée']);
    }

    public function getRoutes(): array
    {
        return array_map(function ($route) {
            return [
                'method' => $route['method'],
                'pattern' => $route['pattern']
            ];
        }, $this->routes);
    }
}