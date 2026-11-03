INSERT INTO `users` (`id`, `username`, `email`, `password`, `role`, `first_name`, `last_name`, `phone`, `avatar`, `status`, `is_first_login`, `login_token`, `token_time`, `created_at`) VALUES
(1, 'admin', 'admin@gmail.com', '$2y$10$6CeCa/5qLk4MGIlo6ft2KuoxK5vTwihvk/Q0lr87YhNRVJUIiN7qe', 'admin', 'Quản trị', 'Viên', '0901234567', 'default-avatar.png', 'inactive', 0, NULL, NULL, '2026-09-01 08:00:00'),
(2, 'an.nguyen', 'an.nguyen@gmail.com', '$2y$10$6CeCa/5qLk4MGIlo6ft2KuoxK5vTwihvk/Q0lr87YhNRVJUIiN7qe', 'staff', 'An', 'Nguyễn Văn', '0912345678', 'default-avatar.png', 'inactive', 0, NULL, NULL, '2026-09-05 09:00:00'),
(3, 'bich.tran', 'bich.tran@gmail.com', '$2y$10$6CeCa/5qLk4MGIlo6ft2KuoxK5vTwihvk/Q0lr87YhNRVJUIiN7qe', 'cashier', 'Bích', 'Trần Thị', '0923456789', 'default-avatar.png', 'inactive', 0, NULL, NULL, '2026-09-10 10:00:00'),
(4, 'cuong.le', 'cuong.le@gmail.com', '$2y$10$6CeCa/5qLk4MGIlo6ft2KuoxK5vTwihvk/Q0lr87YhNRVJUIiN7qe', 'staff', 'Cường', 'Lê Hữu', '0934567890', 'default-avatar.png', 'inactive', 0, NULL, NULL, '2026-09-15 11:00:00'),
(5, 'dung.pham', 'dung.pham@gmail.com', '$2y$10$6CeCa/5qLk4MGIlo6ft2KuoxK5vTwihvk/Q0lr87YhNRVJUIiN7qe', 'staff', 'Dũng', 'Phạm Tiến', '0945678901', 'default-avatar.png', 'inactive', 0, NULL, NULL, '2026-10-14 08:00:00'),
(6, 'hoa.vu', 'hoa.vu@gmail.com', '$2y$10$6CeCa/5qLk4MGIlo6ft2KuoxK5vTwihvk/Q0lr87YhNRVJUIiN7qe', 'staff', 'Hoa', 'Vũ Thị', '0956789012', 'default-avatar.png', 'inactive', 0, NULL, NULL, '2026-09-20 14:00:00'),
(7, 'kien.do', 'kien.do@gmail.com', '$2y$10$6CeCa/5qLk4MGIlo6ft2KuoxK5vTwihvk/Q0lr87YhNRVJUIiN7qe', 'staff', 'Kiên', 'Đỗ Trung', '0967890123', 'default-avatar.png', 'inactive', 0, NULL, NULL, '2026-09-22 15:30:00');

-- 2. SEED CATEGORIES (Danh mục thời trang / phụ kiện)
INSERT INTO `categories` (`id`, `name`, `description`, `created_by`, `created_at`) VALUES
(1, 'Áo Thun & Polo', 'Các dòng áo phông cotton cao cấp, polo thể thao thoáng khí', 1, '2026-09-01 08:30:00'),
(2, 'Áo Sơ Mi Nam Nữ', 'Sơ mi công sở, sơ mi Oxford chống nhăn dạo phố', 1, '2026-09-01 08:35:00'),
(3, 'Quần Jean & Denim', 'Quần jean slimfit, ống đứng co giãn 4 chiều', 1, '2026-09-01 08:40:00'),
(4, 'Quần Tây & Kaki', 'Quần âu may đo phong cách Hàn Quốc thanh lịch', 1, '2026-09-01 08:45:00'),
(5, 'Áo Khoác & Blazer', 'Áo khoác dù bomber trượt nước, blazer nhẹ nhàng', 1, '2026-09-01 08:50:00'),
(6, 'Phụ Kiện Thời Trang', 'Thắt lưng da bò, tất khử mùi, nón lưỡi trai, ví cầm tay', 1, '2026-09-01 08:55:00');

-- 3. SEED PRODUCTS (Sản phẩm kinh doanh)
INSERT INTO `products` (`id`, `name`, `sku`, `category_id`, `barcode`, `import_price`, `price`, `stock_quantity`, `low_stock_threshold`, `size`, `color`, `material`, `image`, `description`, `status`, `created_at`, `last_updated_by`) VALUES
(1, 'Áo Thun Trơn Basic Cotton 100%', 'AT-BAS-W-M', 1, '893601234001', 85000.00, 189000.00, 85, 15, 'M', 'Trắng', 'Cotton 100%', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500', 'Áo thun cổ tròn mềm mại, thoáng mát thấm hút mồ hôi tối đa.', 'active', '2026-09-02 09:00:00', 1),
(2, 'Áo Thun Trơn Basic Cotton 100%', 'AT-BAS-B-L', 1, '893601234002', 85000.00, 189000.00, 42, 15, 'L', 'Đen', 'Cotton 100%', 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=500', 'Áo thun đen basic không phai màu, chuẩn form năng động.', 'active', '2026-09-02 09:10:00', 1),
(3, 'Áo Polo Pique Thể Thao Phối Viền', 'POLO-PIQ-N-L', 1, '893601234003', 140000.00, 289000.00, 30, 10, 'L', 'Xanh Navy', 'Pique Cotton', 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500', 'Form Regular Fit đứng dáng, lịch lãm khi đi làm hoặc chơi thể thao.', 'active', '2026-09-02 09:20:00', 1),
(4, 'Áo Sơ Mi Trắng Oxford Slimfit', 'SM-OXF-W-M', 2, '893601234004', 180000.00, 350000.00, 25, 10, 'M', 'Trắng', 'Vải Oxford', 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500', 'Vải dệt oxford bền đẹp, chống nhăn nhẹ, thiết kế vạt bầu sang trọng.', 'active', '2026-09-03 10:00:00', 1),
(5, 'Áo Sơ Mi Kẻ Caro Hàn Quốc', 'SM-CAR-B-L', 2, '893601234005', 175000.00, 329000.00, 18, 8, 'L', 'Xanh Kẻ', 'Cotton dệt', 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500', 'Họa tiết caro trẻ trung, dễ phối layer áo thun bên trong.', 'active', '2026-09-03 10:15:00', 1),
(6, 'Quần Jean Xanh Co Giãn Slimfit', 'JN-SLM-BL-31', 3, '893601234006', 220000.00, 450000.00, 38, 10, '31', 'Xanh Indigo', 'Denim Spandex', 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500', 'Quần jean co giãn êm ái, màu wash hiện đại bền đẹp qua nhiều lần giặt.', 'active', '2026-09-04 11:00:00', 1),
(7, 'Quần Jean Đen Rách Gối Phong Cách', 'JN-RCK-BK-32', 3, '893601234007', 230000.00, 469000.00, 12, 10, '32', 'Đen Tuyển', 'Denim 12oz', 'https://images.unsplash.com/photo-1542272604-780c96856592?w=500', 'Điểm rách nhẹ gối cá tính, wash wash xước thủ công phong cách streetwear.', 'active', '2026-09-04 11:20:00', 1),
(8, 'Quần Tây Ống Đứng Lưng Chun Ẩn', 'QT-LCH-GR-30', 4, '893601234008', 210000.00, 399000.00, 19, 10, '30', 'Xám Tro', 'Tuyết Mưa Hàn', 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500', 'Quần âu xếp ly tinh tế, lưng thun co giãn 2 bên hông không gò bó bụng.', 'active', '2026-09-05 13:00:00', 1),
(9, 'Áo Khoác Dù Bomber 2 Lớp Trượt Nước', 'AK-BOM-BK-XL', 5, '893601234009', 260000.00, 520000.00, 6, 8, 'XL', 'Đen', 'Polyester trượt nước', 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', 'Chống gió và mưa nhỏ cực tốt, lót dù bên trong thoáng khí.', 'active', '2026-09-06 14:00:00', 1),
(10, 'Thắt Lưng Da Bò Khóa Tự Động', 'TL-DBO-BR-FRE', 6, '893601234010', 95000.00, 220000.00, 50, 12, 'Freesize', 'Nâu Cafe', 'Da bò thật 100%', 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=500', 'Mặt khóa kim loại nguyên khối chống trầy xước, da nguyên miếng bền bỉ.', 'active', '2026-09-06 14:30:00', 1);

-- 4. SEED CUSTOMERS (Khách hàng thành viên)
INSERT INTO `customers` (`id`, `phone`, `full_name`, `address`, `created_at`) VALUES
(1, '0988111222', 'Nguyễn Hoàng Long', '123 Nguyễn Thị Minh Khai, Q.1, TP.HCM', '2026-09-10 10:00:00'),
(2, '0977333444', 'Trần Mai Phương', '45 Lê Duẩn, P. Bến Nghé, Q.1, TP.HCM', '2026-09-12 14:20:00'),
(3, '0966555666', 'Lê Tuấn Kiệt', '89 CMT8, Phường 5, Q. Tân Bình, TP.HCM', '2026-09-15 16:45:00'),
(4, '0911777888', 'Vũ Thị Thanh Hằng', '256 Võ Văn Tần, Q.3, TP.HCM', '2026-09-20 11:30:00'),
(5, '0933999000', 'Đặng Minh Triết', '12 Hoàng Diệu 2, TP. Thủ Đức, TP.HCM', '2026-10-01 09:15:00'),
(6, '0909123987', 'Phạm Quỳnh Anh', '78 Nguyễn Trãi, Phường 3, Q.5, TP.HCM', '2026-10-10 15:00:00');

-- 5. SEED STORE_SETTINGS (Cài đặt cửa hàng, thuế, hóa đơn)
INSERT INTO `store_settings` (`setting_key`, `setting_value`, `setting_type`) VALUES
('store_name', 'B\'TRIPLE FASHION STORE', 'text'),
('store_phone', '1900 6868', 'text'),
('store_address', '19 Nguyễn Hữu Thọ, P. Tân Phong, Quận 7, TP. Hồ Chí Minh', 'text'),
('store_email', 'contact@btriple.vn', 'text'),
('store_tax_code', '0315899988', 'text'),
('order_prefix', 'ORD-', 'text'),
('tax_rate', '10', 'number'),
('return_policy_days', '7', 'number'),
('receipt_thank_you', 'Cảm ơn quý khách đã mua sắm tại B\'TRIPLE! Quý khách vui lòng giữ hóa đơn khi có nhu cầu đổi size trong vòng 7 ngày.', 'textarea');

-- 6. SEED PAYMENT_QRCODES (Mã QR thanh toán ngân hàng)
INSERT INTO `payment_qrcodes` (`payment_method`, `qr_code_path`, `description`, `is_active`) VALUES
('qr_code', 'https://api.vietqr.io/image/970422-0901234567-compact2.jpg?accountName=BTriple%20Fashion&amount=0', 'VietQR Ngân hàng Quân Đội (MB Bank) - Quét mã thanh toán tức thì', 1),
('vnpay', 'https://api.vietqr.io/image/970415-1011223344-compact2.jpg?accountName=BTriple%20POS&amount=0', 'VNPAY-QR Cửa hàng B\'TRIPLE', 0);

-- 7. SEED ORDERS & ORDER_ITEMS (Hóa đơn và Chi tiết để test Báo cáo đa mốc thời gian)
-- Đơn hàng 1 (Tháng trước: 2026-09-25)
INSERT INTO `orders` (`id`, `order_number`, `user_id`, `customer_id`, `customer_snapshot_name`, `customer_snapshot_phone`, `customer_snapshot_address`, `subtotal`, `discount_percent`, `discount_amount`, `tax_amount`, `total_amount`, `payment_method`, `amount_received`, `change_amount`, `status`, `created_at`) VALUES
(1, 'ORD-20260925-001', 2, 1, 'Nguyễn Hoàng Long', '0988111222', '123 Nguyễn Thị Minh Khai, Q.1, TP.HCM', 639000.00, 0.00, 0.00, 63900.00, 702900.00, 'cash', 710000.00, 7100.00, 'completed', '2026-09-25 10:15:00');
INSERT INTO `order_items` (`order_id`, `product_id`, `product_name`, `size`, `color`, `quantity`, `import_price`, `unit_price`, `total_price`) VALUES
(1, 1, 'Áo Thun Trơn Basic Cotton 100%', 'M', 'Trắng', 1, 85000.00, 189000.00, 189000.00),
(1, 6, 'Quần Jean Xanh Co Giãn Slimfit', '31', 'Xanh Indigo', 1, 220000.00, 450000.00, 450000.00);

-- Đơn hàng 2 (7 ngày qua: 2026-10-08)
INSERT INTO `orders` (`id`, `order_number`, `user_id`, `customer_id`, `customer_snapshot_name`, `customer_snapshot_phone`, `customer_snapshot_address`, `subtotal`, `discount_percent`, `discount_amount`, `tax_amount`, `total_amount`, `payment_method`, `amount_received`, `change_amount`, `status`, `created_at`) VALUES
(2, 'ORD-20261008-002', 3, 2, 'Trần Mai Phương', '0977333444', '45 Lê Duẩn, P. Bến Nghé, Q.1, TP.HCM', 578000.00, 5.00, 28900.00, 54910.00, 604010.00, 'qr_code', 604010.00, 0.00, 'completed', '2026-10-08 14:30:00');
INSERT INTO `order_items` (`order_id`, `product_id`, `product_name`, `size`, `color`, `quantity`, `import_price`, `unit_price`, `total_price`) VALUES
(2, 3, 'Áo Polo Pique Thể Thao Phối Viền', 'L', 'Xanh Navy', 2, 140000.00, 289000.00, 578000.00);

-- Đơn hàng 3 (7 ngày qua: 2026-10-10)
INSERT INTO `orders` (`id`, `order_number`, `user_id`, `customer_id`, `customer_snapshot_name`, `customer_snapshot_phone`, `customer_snapshot_address`, `subtotal`, `discount_percent`, `discount_amount`, `tax_amount`, `total_amount`, `payment_method`, `amount_received`, `change_amount`, `status`, `created_at`) VALUES
(3, 'ORD-20261010-003', 2, 3, 'Lê Tuấn Kiệt', '0966555666', '89 CMT8, Phường 5, Q. Tân Bình, TP.HCM', 819000.00, 0.00, 0.00, 81900.00, 900900.00, 'card', 900900.00, 0.00, 'completed', '2026-10-10 16:45:00');
INSERT INTO `order_items` (`order_id`, `product_id`, `product_name`, `size`, `color`, `quantity`, `import_price`, `unit_price`, `total_price`) VALUES
(3, 4, 'Áo Sơ Mi Trắng Oxford Slimfit', 'M', 'Trắng', 1, 180000.00, 350000.00, 350000.00),
(3, 7, 'Quần Jean Đen Rách Gối Phong Cách', '32', 'Đen Tuyển', 1, 230000.00, 469000.00, 469000.00);

-- Đơn hàng 4 (Hôm qua: 2026-10-13)
INSERT INTO `orders` (`id`, `order_number`, `user_id`, `customer_id`, `customer_snapshot_name`, `customer_snapshot_phone`, `customer_snapshot_address`, `subtotal`, `discount_percent`, `discount_amount`, `tax_amount`, `total_amount`, `payment_method`, `amount_received`, `change_amount`, `status`, `created_at`) VALUES
(4, 'ORD-20261013-004', 3, 4, 'Vũ Thị Thanh Hằng', '0911777888', '256 Võ Văn Tần, Q.3, TP.HCM', 740000.00, 10.00, 74000.00, 66600.00, 732600.00, 'cash', 800000.00, 67400.00, 'completed', '2026-10-13 11:20:00');
INSERT INTO `order_items` (`order_id`, `product_id`, `product_name`, `size`, `color`, `quantity`, `import_price`, `unit_price`, `total_price`) VALUES
(4, 8, 'Quần Tây Ống Đứng Lưng Chun Ẩn', '30', 'Xám Tro', 1, 210000.00, 399000.00, 399000.00),
(4, 5, 'Áo Sơ Mi Kẻ Caro Hàn Quốc', 'L', 'Xanh Kẻ', 1, 175000.00, 329000.00, 329000.00),
(4, 10, 'Thắt Lưng Da Bò Khóa Tự Động', 'Freesize', 'Nâu Cafe', 1, 95000.00, 220000.00, 220000.00);

-- Đơn hàng 5 (Hôm nay: 2026-10-14 sáng)
INSERT INTO `orders` (`id`, `order_number`, `user_id`, `customer_id`, `customer_snapshot_name`, `customer_snapshot_phone`, `customer_snapshot_address`, `subtotal`, `discount_percent`, `discount_amount`, `tax_amount`, `total_amount`, `payment_method`, `amount_received`, `change_amount`, `status`, `created_at`) VALUES
(5, 'ORD-20261014-005', 2, 5, 'Đặng Minh Triết', '0933999000', '12 Hoàng Diệu 2, TP. Thủ Đức, TP.HCM', 709000.00, 0.00, 0.00, 70900.00, 779900.00, 'cash', 800000.00, 20100.00, 'completed', '2026-10-14 09:30:00');
INSERT INTO `order_items` (`order_id`, `product_id`, `product_name`, `size`, `color`, `quantity`, `import_price`, `unit_price`, `total_price`) VALUES
(5, 2, 'Áo Thun Trơn Basic Cotton 100%', 'L', 'Đen', 1, 85000.00, 189000.00, 189000.00),
(5, 9, 'Áo Khoác Dù Bomber 2 Lớp Trượt Nước', 'XL', 'Đen', 1, 260000.00, 520000.00, 520000.00);

-- Đơn hàng 6 (Hôm nay: 2026-10-14 trưa)
INSERT INTO `orders` (`id`, `order_number`, `user_id`, `customer_id`, `customer_snapshot_name`, `customer_snapshot_phone`, `customer_snapshot_address`, `subtotal`, `discount_percent`, `discount_amount`, `tax_amount`, `total_amount`, `payment_method`, `amount_received`, `change_amount`, `status`, `created_at`) VALUES
(6, 'ORD-20261014-006', 3, 6, 'Phạm Quỳnh Anh', '0909123987', '78 Nguyễn Trãi, Phường 3, Q.5, TP.HCM', 409000.00, 0.00, 0.00, 40900.00, 449900.00, 'qr_code', 449900.00, 0.00, 'completed', '2026-10-14 11:15:00');
INSERT INTO `order_items` (`order_id`, `product_id`, `product_name`, `size`, `color`, `quantity`, `import_price`, `unit_price`, `total_price`) VALUES
(6, 1, 'Áo Thun Trơn Basic Cotton 100%', 'M', 'Trắng', 1, 85000.00, 189000.00, 189000.00),
(6, 10, 'Thắt Lưng Da Bò Khóa Tự Động', 'Freesize', 'Nâu Cafe', 1, 95000.00, 220000.00, 220000.00);

-- 8. SEED INVENTORY_REPORTS (Nhật ký kho hàng)
INSERT INTO `inventory_reports` (`date`, `product_id`, `user_id`, `change_type`, `quantity`, `quantity_changed`, `previous_quantity`, `new_quantity`, `remarks`, `created_at`) VALUES
('2026-09-02', 1, 1, 'Added', 100, 100, 0, 100, 'Nhập lô hàng áo thun đầu mùa', '2026-09-02 09:00:00'),
('2026-09-02', 2, 1, 'Added', 50, 50, 0, 50, 'Nhập kho áo thun basic đen', '2026-09-02 09:15:00'),
('2026-09-03', 4, 1, 'Added', 30, 30, 0, 30, 'Nhập kho sơ mi Oxford trắng', '2026-09-03 10:00:00'),
('2026-09-04', 6, 1, 'Added', 40, 40, 0, 40, 'Nhập quần jean slimfit xanh', '2026-09-04 11:00:00'),
('2026-09-25', 1, 2, 'Removed', 1, -1, 100, 99, 'Bán hàng tại quầy đơn ORD-20260925-001', '2026-09-25 10:15:00');

-- 9. SEED MESSAGES (Thông báo nội bộ)
INSERT INTO `messages` (`sender_id`, `recipient_id`, `subject`, `message`, `is_read`, `created_at`) VALUES
(1, 2, 'Chào mừng gia nhập B\'TRIPLE POS', 'Chào An, bạn đã được cấp quyền bán hàng tại quầy POS. Hãy kiểm tra kho kỹ trước mỗi ca làm việc.', 1, '2026-09-05 09:30:00'),
(1, 3, 'Quy định thanh toán QR chuyển khoản', 'Nhớ đối chiếu thông báo biến động số dư hoặc màn hình thành công trước khi ấn Hoàn tất đơn hàng nhé.', 1, '2026-09-10 10:30:00'),
(2, 1, 'Báo cáo hàng sắp hết size M', 'Em kiểm tra thấy áo thun basic trắng size M bán rất chạy, đề xuất nhập thêm 50 cái ạ.', 0, '2026-10-12 17:00:00');

-- 10. SEED SHIFTS & ASSIGNMENTS (Ca trực)
INSERT INTO `shifts` (`id`, `shift_name`, `shift_date`, `start_time`, `end_time`, `description`, `max_employees`, `status`, `created_by`, `created_at`) VALUES
(1, 'Ca sáng', '2026-10-14', '08:00:00', '13:00:00', 'Trực quầy thu ngân và kiểm kê đầu ngày', 3, 'in-progress', 1, '2026-10-13 08:00:00'),
(2, 'Ca chiều', '2026-10-14', '13:00:00', '18:00:00', 'Bán hàng giờ cao điểm chiều', 4, 'scheduled', 1, '2026-10-13 08:00:00'),
(3, 'Ca tối', '2026-10-14', '18:00:00', '22:00:00', 'Bán hàng tối và kết ca chốt sổ quỹ tiền mặt', 3, 'scheduled', 1, '2026-10-13 08:00:00');

INSERT INTO `shift_assignments` (`shift_id`, `user_id`, `role`, `status`, `notes`, `assigned_by`, `assigned_at`) VALUES
(1, 2, 'supervisor', 'confirmed', 'Phụ trách mở cửa và kiểm quỹ', 1, '2026-10-13 08:30:00'),
(1, 3, 'regular', 'confirmed', 'Đứng quầy thanh toán POS', 1, '2026-10-13 08:30:00'),
(2, 4, 'regular', 'assigned', 'Hỗ trợ khách hàng thử đồ', 1, '2026-10-13 08:30:00'),
(3, 2, 'supervisor', 'assigned', 'Chốt sổ tiền mặt cuối ngày', 1, '2026-10-13 08:30:00');
