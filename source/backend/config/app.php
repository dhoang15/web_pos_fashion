<?php
declare(strict_types=1);

require_once __DIR__ . DIRECTORY_SEPARATOR . 'env.php';

$sessionSecureValue = getenv('SESSION_SECURE');
$sessionSecure = filter_var(
    $sessionSecureValue === false ? '1' : $sessionSecureValue,
    FILTER_VALIDATE_BOOLEAN,
    FILTER_NULL_ON_FAILURE
);
if ($sessionSecure === null) {
    throw new RuntimeException('SESSION_SECURE must be set to a valid boolean value.');
}

return [
    'session_name' => getenv('SESSION_NAME') ?: 'btriple_pos',
    'session_secure' => $sessionSecure,
    'upload_dir' => dirname(__DIR__) . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads',
    'upload_url' => '/uploads/',
];