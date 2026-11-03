<?php
declare(strict_types=1);

require dirname(__DIR__) . DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR . 'bootstrap.php';

use App\Core\Database;

try {
    $connection = Database::connection();
    $database = $connection->query('SELECT DATABASE()')->fetchColumn();
    $tables = $connection->query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()'
    )->fetchAll(PDO::FETCH_COLUMN);
    $required = ['users', 'categories', 'products', 'customers', 'orders', 'order_items', 'store_settings', 'payment_qrcodes'];
    $missing = array_values(array_diff($required, $tables));
    if ($missing) {
        fwrite(STDERR, 'MySQL đã kết nối; thiếu bảng schema: ' . implode(', ', $missing) . PHP_EOL);
        exit(2);
    }
    echo 'MySQL connection: OK' . PHP_EOL;
    echo 'Database: ' . $database . PHP_EOL;
    echo 'Required application tables: OK' . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . PHP_EOL);
    exit(1);
}
