FROM php:8.2-fpm-alpine

RUN apk add --no-cache postgresql-dev \
    && docker-php-ext-install pdo pdo_pgsql pgsql

RUN apk add --no-cache \
    zip \
    unzip \
    git

WORKDIR /var/www/html

EXPOSE 9000

CMD ["php-fpm"]