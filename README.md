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

## Tài khoản giả lập giao diện

Trên trang đăng nhập, chọn một trong hai nút dùng thử:

- Admin: `admin.demo` / `Admin123!`
- Nhân viên: `staff.demo` / `Staff123!`

Chế độ này chỉ giả lập đăng nhập, điều hướng và quyền giao diện trong tab hiện
tại. Các API demo trả dữ liệu rỗng hoặc xác nhận thao tác giả lập; không có dữ
liệu nào được lưu lên máy chủ hay thay thế backend thật. Trang đã đăng nhập sẽ
hiện cảnh báo DEMO.
