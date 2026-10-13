# B'TRIPLE POS

Giao diện quản lý cửa hàng thời trang gồm trang tổng quan, POS, sản phẩm, khách
hàng, nhân viên, hóa đơn, báo cáo và cài đặt.

## Yêu cầu

- PHP CLI để chạy máy chủ web tích hợp (không cần cài Composer cho mã hiện có).
- Trình duyệt hiện đại và kết nối Internet để tải Bootstrap từ CDN.
- MySQL 8 nếu cần tạo cơ sở dữ liệu từ `database/database.sql`.

Không cần cài Node.js/npm: repository hiện không có `package.json` hoặc frontend
build step.

## Chạy giao diện

Chạy lệnh từ thư mục gốc repository trên Windows, macOS hoặc Linux:

```sh
php -S 127.0.0.1:8000 -t frontend
```

Mở <http://127.0.0.1:8000/>. Không mở trực tiếp file HTML bằng `file://`, vì
trình duyệt cần HTTP để tải các thành phần giao diện dùng chung.

## Tạo cơ sở dữ liệu

Khởi động MySQL 8, sau đó chạy lệnh từ thư mục gốc repository.

macOS/Linux:

```sh
mysql -u root -p < database/database.sql
```

Windows Command Prompt:

```bat
mysql -u root -p < database\database.sql
```

Script tạo database `fashion_pos_db`. Tài khoản và mật khẩu MySQL phải được cấu
hình riêng trên từng máy; không đưa thông tin đăng nhập cá nhân vào Git.

## Trạng thái backend

Frontend hiện gọi API tại `/api/` (xem `frontend/assets/js/api.js`), nhưng
repository hiện chưa chứa API backend hoặc các route tương ứng. Vì vậy đăng
nhập và các thao tác cần dữ liệu sẽ không hoạt động đầy đủ chỉ bằng cách chạy
máy chủ PHP ở trên; đây là thiếu sót chung của repository, không phải khác biệt
Windows/macOS/Linux. File cấu hình database hiện có cũng chưa triển khai kết
nối hay API.

### Hợp đồng API cho sản phẩm và danh mục

- `GET /api/products` trả về các trường hiển thị cần thiết (`id`, `barcode`,
  `name`, `category_id`, `category_name`, `price`, `stock_quantity`, `size`,
  `color`, `status`, `image`, `created_at`, `has_orders`). Chỉ trả
  `import_price` cho admin; với nhân viên, không gửi trường này trong JSON.
- `POST /api/products` nhận JSON khi không đổi ảnh. Khi tạo/cập nhật có ảnh,
  nhận `multipart/form-data` với trường `image_file`; cập nhật dùng
  `POST /api/products/{id}` kèm `_method=PUT` để PHP đọc được cả `$_POST` và
  `$_FILES`. API phải kiểm tra quyền, barcode duy nhất, danh mục tồn tại và
  nội dung file ở phía server. Trả đường dẫn ảnh đã lưu (ví dụ
  `/uploads/products/<tên-ngẫu-nhiên>.jpg`) trong trường `image`.
- Chỉ nhận ảnh PNG/JPEG/WebP, giới hạn hiện tại 5 MB ở giao diện. Backend vẫn
  phải xác minh kích thước và MIME bằng nội dung file, tạo tên file ngẫu nhiên,
  không tin tên/đuôi file do trình duyệt gửi, và chỉ lưu trong thư mục upload
  không thực thi PHP.
- `POST/PUT/DELETE /api/categories[/{id}]` chỉ cho admin. Khi tạo category,
  server tự gán `created_by` từ session đăng nhập; danh sách trả thêm
  `created_by_name` và `created_at`. Không lấy người tạo từ request client.
- Xóa sản phẩm cần kiểm tra đơn hàng trong server và trả HTTP 409 nếu sản phẩm
  đã được bán. Xóa danh mục cũng cần trả HTTP 409 nếu vẫn còn sản phẩm tham
  chiếu. Giao diện dùng `has_orders` để vô hiệu hóa nút xóa, nhưng đây không
  thay thế kiểm tra phía server.

Schema mới đặt `products.barcode` và `products.category_id` là bắt buộc. Nếu
database đã được tạo từ trước, cần xử lý các bản ghi barcode/danh mục đang
trống rồi mới áp dụng migration `NOT NULL`; chạy lại file SQL không tự sửa
cấu trúc bảng đã tồn tại do các lệnh tạo bảng dùng `IF NOT EXISTS`.

## Tài khoản giả lập giao diện

Trên trang đăng nhập, chọn một trong hai nút dùng thử:

- Admin: `admin.demo` / `Admin123!`
- Nhân viên: `staff.demo` / `Staff123!`

Chế độ này chỉ giả lập đăng nhập, điều hướng và quyền giao diện trong tab hiện
tại. Các thao tác sản phẩm/danh mục được lưu tạm trong bộ nhớ của trang demo để
thử luồng giao diện; ảnh chỉ dùng URL xem trước của trình duyệt. Dữ liệu và ảnh
không được lưu lên máy chủ, và sẽ mất khi tải lại trang. Trang đã đăng nhập sẽ
hiện cảnh báo DEMO.
