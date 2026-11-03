<?php
declare(strict_types=1);

require dirname(__DIR__) . DIRECTORY_SEPARATOR . 'src' . DIRECTORY_SEPARATOR . 'bootstrap.php';

use App\Core\Database;

$options = getopt('', ['username:', 'email:', 'first-name:', 'last-name:']);
$username = trim((string)($options['username'] ?? ''));
$email = strtolower(trim((string)($options['email'] ?? '')));
$firstName = trim((string)($options['first-name'] ?? ''));
$lastName = trim((string)($options['last-name'] ?? ''));
$password = rtrim(stream_get_contents(STDIN), "\r\n");

if (!preg_match('/^[a-zA-Z0-9._-]{3,50}$/', $username)) {
    fwrite(STDERR, 'Username must be 3-50 characters: letters, numbers, dot, underscore or hyphen.' . PHP_EOL);
    exit(2);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 100) {
    fwrite(STDERR, 'A valid email address is required.' . PHP_EOL);
    exit(2);
}
if ($firstName === '' || $lastName === '' || mb_strlen($firstName) > 50 || mb_strlen($lastName) > 50) {
    fwrite(STDERR, 'First and last names are required and must be at most 50 characters each.' . PHP_EOL);
    exit(2);
}
if (strlen($password) < 12 || strlen($password) > 4096) {
    fwrite(STDERR, 'Choose a password between 12 and 4096 bytes.' . PHP_EOL);
    exit(2);
}

try {
    $connection = Database::connection();
    if ((int)$connection->query("SELECT COUNT(*) FROM users WHERE role = 'admin' AND status = 'active'")->fetchColumn() > 0) {
        fwrite(STDERR, 'An active administrator already exists; no account was created.' . PHP_EOL);
        exit(3);
    }

    $connection->beginTransaction();
    try {
        $statement = $connection->prepare(
            "INSERT INTO users (username, email, password, role, first_name, last_name, status, is_first_login) " .
            "VALUES (:username, :email, :password, 'admin', :first_name, :last_name, 'active', 0)"
        );
        $statement->execute([
            'username' => $username,
            'email' => $email,
            'password' => password_hash($password, PASSWORD_DEFAULT),
            'first_name' => $firstName,
            'last_name' => $lastName,
        ]);
        $connection->commit();
    } catch (Throwable $error) {
        if ($connection->inTransaction()) {
            $connection->rollBack();
        }
        throw $error;
    }
    echo 'Administrator account created. The password was not stored in plain text.' . PHP_EOL;
} catch (Throwable $error) {
    fwrite(STDERR, $error->getMessage() . PHP_EOL);
    exit(1);
} finally {
    if (isset($password)) {
        $password = '';
    }
}
