SET NAMES utf8mb4;

INSERT INTO `users` (
    `id`,
    `username`,
    `email`,
    `password`,
    `role`,
    `first_name`,
    `last_name`,
    `phone`,
    `avatar`,
    `status`,
    `is_first_login`,
    `login_token`,
    `token_time`,
    `created_at`
) VALUES (
    1,
    'admin',
    'admin@gmail.com',
    '$2y$10$6UDgpBGj.Zuou.vgnfYWMuBeqqTVVs8dyOAAScP8cD1yrkUB6kUHC',
    'admin',
    'Quản trị',
    'Viên',
    '0901234567',
    'default-avatar.png',
    'active',
    0,
    NULL,
    NULL,
    CURRENT_TIMESTAMP
);
