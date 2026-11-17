FROM php:8.2-cli

RUN apt-get update \
    && apt-get install -y --no-install-recommends libonig-dev \
    && docker-php-ext-install pdo_mysql mbstring \
    && printf '%s\n' 'upload_max_filesize=6M' 'post_max_size=8M' > /usr/local/etc/php/conf.d/uploads.ini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN mkdir -p backend/public/uploads \
    && chown -R www-data:www-data backend/public/uploads

USER www-data

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD php -r '$response = @file_get_contents("http://127.0.0.1:8000/api/auth/csrf-token"); exit($response === false ? 1 : 0);'

CMD ["php", "-S", "0.0.0.0:8000", "-t", "frontend", "backend/dev-router.php"]
