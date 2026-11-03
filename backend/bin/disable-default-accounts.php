<?php
declare(strict_types=1);

require dirname(__DIR__) . DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR . 'bootstrap.php';

use App\Core\Database;

$legacySeedPasswordHash = '$2a$10$pbJdh9D2btC6Goyxc3GFju8rMNocTZH6eAAPlXTUxDxaSlio8fViO';

try {
    $connection = Database::connection();
    $statement = $connection->prepare(
        'UPDATE users SET status = :status, is_first_login = 0, login_token = NULL, token_time = NULL ' .
        'WHERE password = :password'
    );
    $statement->execute(['status' => 'inactive', 'password' => $legacySeedPasswordHash]);
    echo 'Disabled legacy default-seed accounts: ' . $statement->rowCount() . PHP_EOL;
    echo 'Create a new administrator with backend/bin/create-admin.ps1.' . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . PHP_EOL);
    exit(1);
}
