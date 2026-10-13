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

Database mới có tài khoản ban đầu `admin/admin` (email `admin@gmail.com`). Hãy
đổi mật khẩu admin ngay sau lần đăng nhập đầu tiên. Script không tạo sản phẩm,
khách hàng hoặc đơn hàng mẫu.

Nếu đã tạo database từ phiên bản schema cũ, chạy một lần:

```sh
mysql -u root -p fashion_pos_db < database/migrations/001_add_order_snapshots_and_default_admin.sql
```

Migration bổ sung snapshot khách hàng trên đơn nháp, snapshot sản phẩm trên hóa
đơn cũ và các chỉ mục phục vụ bộ lọc frontend. Không chạy migration này sau khi
đã tạo database mới bằng `database/database.sql`.

## Trạng thái backend

Frontend hiện gọi API tại `/api/` (xem `frontend/assets/js/api.js`). Repository
chưa chứa API backend hoặc các route tương ứng. Vì vậy đăng nhập và các thao tác
cần dữ liệu chưa chạy được đầy đủ chỉ bằng máy chủ PHP tích hợp; cần triển khai
backend PHP không dùng framework theo `frontend/API_CONTRACT.md` và kết nối MySQL
qua cấu hình riêng. File cấu hình database hiện có chưa triển khai kết nối hay
API.

## Kiểm thử giao diện

Frontend không còn tài khoản, dữ liệu hoặc API giả lập. Cần chạy backend tại
cùng origin với frontend và cung cấp các route `/api/` trước khi đăng nhập hoặc
thực hiện các thao tác cần dữ liệu. Khi backend chưa chạy, frontend sẽ báo lỗi
kết nối thay vì hiển thị hoặc xác nhận dữ liệu mẫu.

Các endpoint, luồng đăng nhập qua link mời, trường dữ liệu, định dạng phản hồi,
quy tắc upload và ánh xạ database được ghi trong
[`frontend/API_CONTRACT.md`](frontend/API_CONTRACT.md).
