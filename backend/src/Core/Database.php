<?php
declare(strict_types=1);

namespace App\Core;

use PDO;
use PDOException;

final class Database
{
    private static ?PDO $connection = null;

    public static function connection(): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $config = require dirname(__DIR__, 2) . DIRECTORY_SEPARATOR . 'config' . DIRECTORY_SEPARATOR . 'database.php';
        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=%s',
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );

        $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
        ];
        if ($config['ssl_ca'] !== '') {
            if (!defined('PDO::MYSQL_ATTR_SSL_CA') || !is_readable($config['ssl_ca'])) {
                throw new ApiException('Không thể đọc chứng thư CA TLS của MySQL. Kiểm tra DB_SSL_CA và extension pdo_mysql.', 503, 'DATABASE_TLS_CONFIGURATION');
            }
            $options[constant('PDO::MYSQL_ATTR_SSL_CA')] = $config['ssl_ca'];
            if (defined('PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT')) {
                $options[constant('PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT')] = true;
            }
        }

        try {
            self::$connection = new PDO($dsn, $config['username'], $config['password'], $options);
        } catch (PDOException $error) {
            error_log('MySQL connection failed (' . $error->getCode() . '): ' . $error->getMessage());
            throw new ApiException('Không thể kết nối cơ sở dữ liệu. Kiểm tra cấu hình DB_* và schema.', 503, 'DATABASE_UNAVAILABLE');
        }

        return self::$connection;
    }
}
