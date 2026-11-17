<?php
declare(strict_types=1);

$uriPath = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
if (strpos($uriPath, "\0") !== false || preg_match('#(?:^|/)\.\.(?:/|$)#', $uriPath)) {
    http_response_code(400);
    exit('Invalid path');
}

if ($uriPath === '/api' || strpos($uriPath, '/api/') === 0) {
    require __DIR__ . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'index.php';
    return true;
}

if (strpos($uriPath, '/uploads/') === 0) {
    $filename = basename(substr($uriPath, strlen('/uploads/')));
    $file = __DIR__ . DIRECTORY_SEPARATOR . 'public' . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . $filename;
    if (!is_file($file)) {
        http_response_code(404);
        exit;
    }
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file);
    if (!in_array($mime, ['image/png', 'image/jpeg', 'image/webp'], true)) {
        http_response_code(404);
        exit;
    }
    header('Content-Type: ' . $mime);
    header('X-Content-Type-Options: nosniff');
    readfile($file);
    return true;
}

if ($uriPath === '/') {
    $uriPath = '/index.html';
}
$staticFile = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'frontend' .
    str_replace('/', DIRECTORY_SEPARATOR, $uriPath);
$frontendRoot = realpath(__DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'frontend');
$resolvedFile = realpath($staticFile);
if ($resolvedFile !== false && $frontendRoot !== false &&
    strpos($resolvedFile, $frontendRoot . DIRECTORY_SEPARATOR) === 0 && is_file($resolvedFile)) {
    return false;
}
http_response_code(404);
return true;
