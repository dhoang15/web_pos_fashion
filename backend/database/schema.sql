-- ========================================================
-- DỰ ÁN CUỐI KỲ: HỆ THỐNG QUẢN LÝ BÁN HÀNG POINT OF SALE (POS)
-- MÔN HỌC: LẬP TRÌNH WEB & ỨNG DỤNG (503073)
-- DATABASE: MySQL 8.x / MariaDB
-- CHARSET: utf8mb4 / COLLATE: utf8mb4_unicode_ci
-- ========================================================

/*!40101 SET NAMES utf8mb4 */;

-- 0. TẠO VÀ SỬ DỤNG DATABASE

CREATE DATABASE IF NOT EXISTS `fashion_pos_db` 
  DEFAULT CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;
USE `fashion_pos_db`;

-- 1. BẢNG USERS (Quản lý tài khoản Admin & Nhân viên bán hàng)

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(50) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','staff','cashier') NOT NULL DEFAULT 'staff',
  `first_name` VARCHAR(50) NOT NULL,
  `last_name` VARCHAR(50) NOT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `avatar` VARCHAR(255) DEFAULT 'default-avatar.png',
  `status` ENUM('active','inactive','locked') NOT NULL DEFAULT 'active',
  `is_first_login` TINYINT(1) NOT NULL DEFAULT 1,
  `login_token` VARCHAR(255) DEFAULT NULL COMMENT 'Mã token lời mời 1 phút gửi qua email',
  `token_time` DATETIME DEFAULT NULL COMMENT 'Thời gian tạo token để tính hạn 1 phút',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_username` (`username`),
  UNIQUE KEY `uk_users_email` (`email`),
  KEY `idx_users_role_status` (`role`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. BẢNG CATEGORIES (Danh mục sản phẩm)

CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `created_by` INT DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_categories_created_by` (`created_by`),
  CONSTRAINT `fk_categories_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. BẢNG PRODUCTS (Sản phẩm kinh doanh)

CREATE TABLE IF NOT EXISTS `products` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `sku` VARCHAR(64) DEFAULT NULL,
  `category_id` INT NOT NULL,
  `barcode` VARCHAR(100) NOT NULL,
  `import_price` DECIMAL(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Giá nhập gốc - chỉ Admin được xem để tính lợi nhuận',
  `price` DECIMAL(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Giá bán lẻ tại quầy POS',
  `stock_quantity` INT NOT NULL DEFAULT 0,
  `low_stock_threshold` INT NOT NULL DEFAULT 10,
  `size` VARCHAR(20) DEFAULT NULL,
  `color` VARCHAR(50) DEFAULT NULL,
  `material` VARCHAR(100) DEFAULT NULL,
  `image` VARCHAR(255) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `status` ENUM('active','inactive') NOT NULL DEFAULT 'active',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_updated_by` INT DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_products_barcode` (`barcode`),
  KEY `idx_products_category` (`category_id`),
  KEY `idx_products_status_category` (`status`, `category_id`),
  KEY `fk_products_last_updated_by` (`last_updated_by`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`),
  CONSTRAINT `fk_products_last_updated_by` FOREIGN KEY (`last_updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. BẢNG CUSTOMERS (Khách hàng thành viên)
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `phone` VARCHAR(20) NOT NULL,
  `full_name` VARCHAR(100) NOT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_customers_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. BẢNG ORDERS (Hóa đơn bán lẻ POS)
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_number` VARCHAR(50) NOT NULL,
  `user_id` INT NOT NULL COMMENT 'Nhân viên / thu ngân lập đơn',
  `customer_id` INT DEFAULT NULL COMMENT 'Khách hàng (NULL nếu khách vãng lai)',
  `customer_snapshot_name` VARCHAR(100) DEFAULT NULL,
  `customer_snapshot_phone` VARCHAR(20) DEFAULT NULL,
  `customer_snapshot_address` VARCHAR(255) DEFAULT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  `subtotal` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  `discount_percent` DECIMAL(5,2) DEFAULT '0.00',
  `discount_amount` DECIMAL(10,2) DEFAULT '0.00',
  `tax_amount` DECIMAL(10,2) DEFAULT '0.00',
  `payment_method` ENUM('cash','card','qr_code') NOT NULL DEFAULT 'cash',
  `amount_received` DECIMAL(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Tiền khách đưa',
  `change_amount` DECIMAL(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Tiền thừa trả khách',
  `status` ENUM('pending','completed','cancelled') NOT NULL DEFAULT 'completed',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_orders_order_number` (`order_number`),
  KEY `fk_orders_user` (`user_id`),
  KEY `fk_orders_customer` (`customer_id`),
  KEY `idx_orders_user_created` (`user_id`, `created_at`),
  KEY `idx_orders_status_created` (`status`, `created_at`),
  KEY `idx_orders_created_at` (`created_at`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BẢNG ORDER_ITEMS (Chi tiết từng món trong hóa đơn)

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `order_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `product_name` VARCHAR(100) NOT NULL COMMENT 'Snapshot tên lúc bán',
  `size` VARCHAR(20) DEFAULT NULL,
  `color` VARCHAR(50) DEFAULT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `import_price` DECIMAL(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Snapshot giá nhập lúc bán',
  `unit_price` DECIMAL(10,2) NOT NULL DEFAULT '0.00' COMMENT 'Giá bán lẻ lúc bán',
  `total_price` DECIMAL(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `idx_order_items_product` (`product_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. BẢNG STORE_SETTINGS (Cấu hình thông tin cửa hàng & in hóa đơn)
-- Frontend settings.js & pos.js đồng bộ với bảng này
CREATE TABLE IF NOT EXISTS `store_settings` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL,
  `setting_value` TEXT DEFAULT NULL,
  `setting_type` VARCHAR(50) DEFAULT 'text',
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_store_settings_key` (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. BẢNG PAYMENT_QRCODES (Mã QR thanh toán chuyển khoản tại quầy)
-- Frontend pos.js mở modal QR từ bảng này
CREATE TABLE IF NOT EXISTS `payment_qrcodes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'qr_code',
  `qr_code_path` VARCHAR(255) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_qrcodes_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. BẢNG INVENTORY_REPORTS (Nhật ký biến động xuất nhập tồn kho)
CREATE TABLE IF NOT EXISTS `inventory_reports` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `date` DATE NOT NULL,
  `product_id` INT NOT NULL,
  `user_id` INT DEFAULT NULL,
  `change_type` ENUM('Added','Removed') NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `quantity_changed` INT NOT NULL DEFAULT 0,
  `previous_quantity` INT DEFAULT NULL,
  `new_quantity` INT DEFAULT NULL,
  `remarks` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_inventory_reports_product` (`product_id`),
  KEY `fk_inventory_reports_user` (`user_id`),
  KEY `idx_inventory_reports_date` (`date` DESC),
  CONSTRAINT `fk_inventory_reports_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inventory_reports_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. BẢNG MESSAGES (Hộp thư nội bộ & Thông báo hệ thống)
CREATE TABLE IF NOT EXISTS `messages` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `sender_id` INT NOT NULL,
  `recipient_id` INT DEFAULT NULL,
  `subject` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `parent_message_id` INT DEFAULT NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_messages_sender` (`sender_id`),
  KEY `fk_messages_recipient` (`recipient_id`),
  KEY `fk_messages_parent` (`parent_message_id`),
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_messages_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_messages_parent` FOREIGN KEY (`parent_message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. BẢNG SHIFTS & SHIFT_ASSIGNMENTS (Quản lý ca trực nhân viên)
CREATE TABLE IF NOT EXISTS `shifts` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `shift_name` VARCHAR(100) NOT NULL,
  `shift_date` DATE NOT NULL,
  `start_time` TIME NOT NULL,
  `end_time` TIME NOT NULL,
  `description` TEXT DEFAULT NULL,
  `location` VARCHAR(255) DEFAULT 'Cửa hàng chính',
  `max_employees` INT NOT NULL DEFAULT 5,
  `status` ENUM('scheduled','in-progress','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  `created_by` INT NOT NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_shifts_creator` (`created_by`),
  KEY `idx_shifts_date` (`shift_date`),
  CONSTRAINT `fk_shifts_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `shift_assignments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `shift_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `role` ENUM('supervisor','regular') NOT NULL DEFAULT 'regular',
  `status` ENUM('assigned','confirmed','declined','completed','no-show') NOT NULL DEFAULT 'assigned',
  `notes` TEXT DEFAULT NULL,
  `assigned_by` INT NOT NULL,
  `assigned_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_shift_user` (`shift_id`, `user_id`),
  KEY `fk_shift_assign_user` (`user_id`),
  KEY `fk_shift_assign_by` (`assigned_by`),
  CONSTRAINT `fk_shift_assign_shift` FOREIGN KEY (`shift_id`) REFERENCES `shifts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shift_assign_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_shift_assign_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;