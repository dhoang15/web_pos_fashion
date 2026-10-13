-- Run this migration exactly once for an existing fashion_pos_db database.
USE `fashion_pos_db`;

ALTER TABLE `orders`
  ADD COLUMN `customer_snapshot_name` varchar(100) DEFAULT NULL AFTER `customer_id`,
  ADD COLUMN `customer_snapshot_phone` varchar(20) DEFAULT NULL AFTER `customer_snapshot_name`,
  ADD COLUMN `customer_snapshot_address` varchar(255) DEFAULT NULL AFTER `customer_snapshot_phone`;

ALTER TABLE `order_items`
  ADD COLUMN `product_name` varchar(100) DEFAULT NULL AFTER `product_id`,
  ADD COLUMN `size` varchar(20) DEFAULT NULL AFTER `product_name`,
  ADD COLUMN `color` varchar(50) DEFAULT NULL AFTER `size`;

UPDATE `orders` AS o
LEFT JOIN `customers` AS c ON c.`id` = o.`customer_id`
SET o.`customer_snapshot_name` = c.`full_name`,
    o.`customer_snapshot_phone` = c.`phone`,
    o.`customer_snapshot_address` = c.`address`
WHERE o.`customer_id` IS NOT NULL;

UPDATE `order_items` AS oi
LEFT JOIN `products` AS p ON p.`id` = oi.`product_id`
SET oi.`product_name` = COALESCE(p.`name`, 'Sản phẩm'),
    oi.`size` = p.`size`,
    oi.`color` = p.`color`;

ALTER TABLE `order_items`
  MODIFY COLUMN `product_name` varchar(100) NOT NULL;

ALTER TABLE `orders`
  ADD KEY `idx_orders_user_created` (`user_id`,`created_at`),
  ADD KEY `idx_orders_status_created` (`status`,`created_at`),
  ADD KEY `idx_orders_payment_created` (`payment_method`,`created_at`);

ALTER TABLE `products`
  ADD KEY `idx_products_status_category` (`status`,`category_id`);

ALTER TABLE `users`
  ADD KEY `idx_users_role_status` (`role`,`status`);

-- Keep the required default login available without replacing an existing admin.
INSERT IGNORE INTO `users`
  (`username`, `email`, `password`, `role`, `first_name`, `last_name`, `status`, `is_first_login`)
VALUES
  ('admin', 'admin@gmail.com', '$2a$10$pbJdh9D2btC6Goyxc3GFju8rMNocTZH6eAAPlXTUxDxaSlio8fViO', 'admin', 'Quản trị', 'viên', 'active', 0);
