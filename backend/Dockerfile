FROM php:8.2-fpm-alpine

# Install dependencies
RUN apk add --no-cache \
    postgresql-dev \
    nginx \
    && docker-php-ext-install pdo pdo_pgsql pgsql

# Copy application
WORKDIR /var/www/html
COPY . .

# Copy Nginx config
COPY docker/nginx/default.conf /etc/nginx/http.d/default.conf

# Permissions
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# Start script
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 80

CMD ["/start.sh"]