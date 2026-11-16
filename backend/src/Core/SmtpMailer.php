<?php
declare(strict_types=1);

namespace App\Core;

final class SmtpMailer
{
    public static function send(string $recipient, string $subject, string $body): void
    {
        $host = trim((string)(getenv('SMTP_HOST') ?: ''));
        $port = filter_var(getenv('SMTP_PORT') ?: '587', FILTER_VALIDATE_INT);
        $encryption = strtolower(trim((string)(getenv('SMTP_ENCRYPTION') ?: 'tls')));
        $username = (string)(getenv('SMTP_USERNAME') ?: '');
        $password = (string)(getenv('SMTP_PASSWORD') ?: '');
        $from = trim((string)(getenv('MAIL_FROM') ?: ''));
        $fromName = "B'TRIPLE POS";

        if ($host === '' || $port === false || $port < 1 || $port > 65535 || !in_array($encryption, ['tls', 'ssl'], true) ||
            $username === '' || $password === '' || !filter_var($from, FILTER_VALIDATE_EMAIL) ||
            !filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
            throw new ApiException('Cấu hình SMTP chưa đầy đủ hoặc không hợp lệ. Kiểm tra SMTP_HOST, SMTP_PORT, SMTP_ENCRYPTION, SMTP_USERNAME, SMTP_PASSWORD và MAIL_FROM.', 503, 'SMTP_NOT_CONFIGURED');
        }
        if (preg_match('/[\r\n]/', $host . $username . $from . $fromName . $recipient)) {
            throw new ApiException('Cấu hình email chứa ký tự không hợp lệ.', 503, 'SMTP_INVALID_CONFIGURATION');
        }

        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => true,
                'verify_peer_name' => true,
                'peer_name' => $host,
                'SNI_enabled' => true,
            ],
        ]);
        $transport = $encryption === 'ssl' ? 'ssl://' : 'tcp://';
        $socket = @stream_socket_client(
            $transport . $host . ':' . $port,
            $errorCode,
            $errorMessage,
            15,
            STREAM_CLIENT_CONNECT,
            $context
        );
        if (!is_resource($socket)) {
            error_log('SMTP connection failed (' . $errorCode . '): ' . $errorMessage);
            throw new ApiException('Không kết nối được máy chủ SMTP. Kiểm tra host, port và kết nối mạng.', 503, 'SMTP_CONNECTION_FAILED');
        }

        stream_set_timeout($socket, 15);
        try {
            self::expect($socket, [220]);
            self::command($socket, 'EHLO btriple-pos.local', [250]);
            if ($encryption === 'tls') {
                self::command($socket, 'STARTTLS', [220]);
                $cryptoEnabled = stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                if ($cryptoEnabled !== true) {
                    throw new ApiException('Không thiết lập được TLS tới máy chủ SMTP.', 503, 'SMTP_TLS_FAILED');
                }
                self::command($socket, 'EHLO btriple-pos.local', [250]);
            }

            self::command($socket, 'AUTH LOGIN', [334], 'SMTP_AUTH_FAILED');
            self::command($socket, base64_encode($username), [334], 'SMTP_AUTH_FAILED');
            self::command($socket, base64_encode($password), [235], 'SMTP_AUTH_FAILED');
            self::command($socket, 'MAIL FROM:<' . $from . '>', [250]);
            self::command($socket, 'RCPT TO:<' . $recipient . '>', [250, 251]);
            self::command($socket, 'DATA', [354]);

            $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
            $encodedFromName = '=?UTF-8?B?' . base64_encode($fromName) . '?=';
            $message = implode("\r\n", [
                'Date: ' . gmdate('D, d M Y H:i:s') . ' +0000',
                'From: ' . $encodedFromName . ' <' . $from . '>',
                'To: <' . $recipient . '>',
                'Subject: ' . $encodedSubject,
                'MIME-Version: 1.0',
                'Content-Type: text/plain; charset=UTF-8',
                'Content-Transfer-Encoding: base64',
                '',
                chunk_split(base64_encode($body), 76, "\r\n"),
            ]);
            self::write($socket, $message . "\r\n.\r\n");
            self::expect($socket, [250]);
            self::write($socket, "QUIT\r\n");
        } catch (ApiException $error) {
            throw $error;
        } catch (\Throwable $error) {
            error_log('SMTP delivery failed: ' . $error->getMessage());
            throw new ApiException('Máy chủ SMTP không gửi được email. Kiểm tra cấu hình và thử lại.', 503, 'SMTP_DELIVERY_FAILED');
        } finally {
            fclose($socket);
        }
    }

    private static function command(
        $socket,
        string $command,
        array $expectedCodes,
        string $errorCode = 'SMTP_DELIVERY_FAILED'
    ): void
    {
        self::write($socket, $command . "\r\n");
        self::expect($socket, $expectedCodes, $errorCode);
    }

    private static function write($socket, string $data): void
    {
        $offset = 0;
        $length = strlen($data);
        while ($offset < $length) {
            $written = fwrite($socket, substr($data, $offset));
            if ($written === false || $written === 0) {
                throw new \RuntimeException('Incomplete SMTP write.');
            }
            $offset += $written;
        }
    }

    private static function expect($socket, array $expectedCodes, string $errorCode = 'SMTP_DELIVERY_FAILED'): void
    {
        $code = null;
        for ($lineCount = 0; $lineCount < 50; $lineCount++) {
            $line = fgets($socket, 2048);
            if ($line === false) {
                $metadata = stream_get_meta_data($socket);
                throw new \RuntimeException(!empty($metadata['timed_out']) ? 'SMTP response timed out.' : 'SMTP server closed the connection.');
            }
            if (!preg_match('/^(\d{3})([ -])/', $line, $match)) {
                throw new \RuntimeException('Malformed SMTP response.');
            }
            $code = (int)$match[1];
            if ($match[2] === ' ') {
                break;
            }
        }

        if ($code === null || !in_array($code, $expectedCodes, true)) {
            if ($errorCode === 'SMTP_AUTH_FAILED') {
                throw new ApiException('Máy chủ SMTP từ chối xác thực. Kiểm tra SMTP_USERNAME và App Password.', 503, $errorCode, ['smtp_status' => $code]);
            }
            if ($errorCode === 'SMTP_DELIVERY_FAILED') {
                throw new ApiException('Máy chủ SMTP từ chối thao tác gửi email. Kiểm tra địa chỉ người gửi và quyền gửi thư.', 503, $errorCode, ['smtp_status' => $code]);
            }
            throw new \RuntimeException('Unexpected SMTP response code ' . (string)$code . '.');
        }
    }
}
