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
}