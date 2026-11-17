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
)
ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id);

-- A small, repeatable clothing catalog for local/demo POS use.
INSERT INTO `categories` (`name`, `description`, `created_by`)
SELECT sample.`name`, sample.`description`, 1
FROM (
    SELECT 'Áo' AS `name`, 'Áo thun, sơ mi và áo khoác.' AS `description`
    UNION ALL SELECT 'Quần', 'Quần jeans và quần âu.'
    UNION ALL SELECT 'Váy', 'Váy mặc hằng ngày và đi chơi.'
    UNION ALL SELECT 'Phụ kiện', 'Phụ kiện thời trang.'
) AS sample
WHERE NOT EXISTS (
    SELECT 1 FROM `categories` existing
    WHERE LOWER(existing.`name`) = LOWER(sample.`name`)
);

INSERT INTO `products` (
    `name`, `sku`, `category_id`, `barcode`, `import_price`, `price`,
    `stock_quantity`, `low_stock_threshold`, `size`, `color`, `material`,
    `description`, `status`, `last_updated_by`
)
SELECT
    sample.`name`, sample.`sku`,
    (SELECT MIN(category.`id`) FROM `categories` category WHERE category.`name` = sample.`category_name`),
    sample.`barcode`,
    sample.`import_price`, sample.`price`, sample.`stock_quantity`,
    sample.`low_stock_threshold`, sample.`size`, sample.`color`, sample.`material`,
    sample.`description`, 'active', 1
FROM (
    SELECT 'Áo' AS `category_name`, 'Áo thun basic cotton' AS `name`, 'BT-DEMO-TSHIRT-001' AS `sku`, '8938501000011' AS `barcode`, 90000.00 AS `import_price`, 159000.00 AS `price`, 30 AS `stock_quantity`, 5 AS `low_stock_threshold`, 'M' AS `size`, 'Trắng' AS `color`, 'Cotton 100%' AS `material`, 'Áo thun basic cổ tròn, dễ phối đồ.' AS `description`
    UNION ALL SELECT 'Áo', 'Áo sơ mi Oxford', 'BT-DEMO-SHIRT-001', '8938501000012', 180000.00, 329000.00, 16, 5, 'M', 'Xanh nhạt', 'Cotton Oxford', 'Áo sơ mi Oxford tay dài.'
    UNION ALL SELECT 'Áo', 'Áo khoác denim', 'BT-DEMO-JACKET-001', '8938501000013', 390000.00, 690000.00, 8, 4, 'L', 'Xanh denim', 'Denim', 'Áo khoác denim form cổ điển.'
    UNION ALL SELECT 'Quần', 'Quần jeans straight', 'BT-DEMO-JEANS-001', '8938501000014', 280000.00, 499000.00, 12, 4, '32', 'Xanh đậm', 'Denim co giãn', 'Quần jeans ống đứng.'
    UNION ALL SELECT 'Quần', 'Quần âu slim fit', 'BT-DEMO-TROUSER-001', '8938501000015', 240000.00, 449000.00, 4, 5, '30', 'Đen', 'Polyester pha rayon', 'Quần âu công sở, tồn kho thấp.'
    UNION ALL SELECT 'Váy', 'Váy midi hoa', 'BT-DEMO-DRESS-001', '8938501000016', 260000.00, 459000.00, 10, 4, 'S', 'Hoa nhí', 'Linen pha', 'Váy midi họa tiết hoa nhí.'
    UNION ALL SELECT 'Phụ kiện', 'Túi tote canvas', 'BT-DEMO-TOTE-001', '8938501000017', 75000.00, 159000.00, 25, 5, 'Free size', 'Kem', 'Canvas', 'Túi tote vải canvas dùng hằng ngày.'
    UNION ALL SELECT 'Phụ kiện', 'Thắt lưng da cổ điển', 'BT-DEMO-BELT-001', '8938501000018', 120000.00, 249000.00, 6, 3, '32', 'Nâu', 'Da tổng hợp', 'Thắt lưng khóa kim loại.'
) AS sample
WHERE NOT EXISTS (
    SELECT 1 FROM `products` existing
    WHERE existing.`barcode` = sample.`barcode`
);
