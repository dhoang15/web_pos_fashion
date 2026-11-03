# B'TRIPLE POS

Ứng dụng quản lý cửa hàng thời trang gồm POS, sản phẩm, danh mục, khách hàng,
hóa đơn, báo cáo, nhân viên, hồ sơ và cài đặt.

## Yêu cầu

- PHP 8.1+ với `pdo_mysql`, `fileinfo` và `mbstring`.
- MySQL 8+.
- Trình duyệt hiện đại và kết nối Internet để tải Bootstrap từ CDN.

Frontend không cần Node.js/npm. Backend dùng PHP thuần, không cần cài Composer.

## Thiết lập cơ sở dữ liệu

Từ thư mục gốc repository, tạo database và nạp schema cùng dữ liệu ban đầu:

```powershell
cmd /c "mysql -u root -p < backend\database\schema.sql"
cmd /c "mysql -u root -p fashion_pos_db < backend\database\seed.sql"
```

Tạo file cấu hình rồi điền thông tin database:

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

Không đưa mật khẩu thật vào Git. Tài khoản trong seed chỉ là dữ liệu mẫu, bị vô
hiệu hóa và không có mật khẩu đăng nhập dùng được. Sau khi cấu hình database,
tạo quản trị viên đầu tiên bằng mật khẩu riêng:

```powershell
.\backend\bin\create-admin.ps1 -Username owner -Email owner@example.com -FirstName Ten -LastName QuanTri
```

Script hỏi mật khẩu mà không hiển thị ký tự khi nhập. Chọn mật khẩu riêng tối
thiểu 12 ký tự. Chỉ nạp `seed.sql` một lần trên database mới vì seed thêm dữ
liệu mẫu. Nếu database đã nạp seed cũ, trước tiên chạy
`php backend\bin\disable-default-accounts.php`, rồi tạo quản trị viên mới bằng
lệnh trên.

Để dùng **MySQL bên ngoài**, đặt `DB_HOST` thành endpoint/DNS do nhà cung cấp
cấp (không dùng `localhost` hoặc `0.0.0.0`), `DB_PORT`, `DB_DATABASE`,
`DB_USERNAME` và `DB_PASSWORD`. Nếu nhà cung cấp yêu cầu TLS, tải CA certificate
theo hướng dẫn của họ và đặt đường dẫn tuyệt đối vào `DB_SSL_CA`. `DB_HOST` phải
khớp hostname trên certificate.

Trên MySQL server, bật truy cập từ máy chạy Backend, chỉ allowlist IP egress của
máy đó ở firewall/security group và tạo database user giới hạn theo IP Backend.
Không mở cổng 3306 cho mọi địa chỉ (`0.0.0.0/0`). Ví dụ SQL sau chạy trên MySQL
server sau khi thay giá trị trong ngoặc:

```sql
CREATE USER 'btriple_app'@'<BACKEND_IP>' IDENTIFIED BY '<STRONG_PASSWORD>' REQUIRE SSL;
GRANT SELECT, INSERT, UPDATE, DELETE ON fashion_pos_db.* TO 'btriple_app'@'<BACKEND_IP>';
```

Tạo database và chạy `schema.sql`, `seed.sql` bằng tài khoản quản trị database
trước; tài khoản ứng dụng không cần quyền `CREATE`/`DROP`. Sau khi cấu hình `.env`,
kiểm tra kết nối và schema (không in thông tin đăng nhập):

```powershell
php backend\bin\check-db.php
```

Với MySQL từ xa, chạy `schema.sql` và `seed.sql` qua client có hostname/port
của nhà cung cấp, ví dụ:

```powershell
mysql --host=<MYSQL_HOST> --port=<MYSQL_PORT> --user=<DB_ADMIN> -p < backend\database\schema.sql
mysql --host=<MYSQL_HOST> --port=<MYSQL_PORT> --user=<DB_ADMIN> -p fashion_pos_db < backend\database\seed.sql
```

Thay các giá trị trong ngoặc bằng thông tin nhà cung cấp. Lệnh sẽ hỏi mật khẩu,
không ghi mật khẩu trực tiếp vào lệnh hoặc Git.

## Chạy ứng dụng cục bộ

Từ thư mục gốc:

```powershell
php -S 127.0.0.1:8000 -t frontend backend/dev-router.php
```

Mở <http://127.0.0.1:8000/>. Router phát tĩnh Frontend, chuyển `/api/*` vào
Backend và phục vụ ảnh tải lên tại `/uploads/`, cùng origin để cookie phiên và
CSRF hoạt động đúng. Không mở HTML trực tiếp bằng `file://`.

Để gửi lời mời nhân viên, cấu hình `APP_URL`, `MAIL_FROM` và dịch vụ mail của
PHP trên máy chủ. Nếu chưa cấu hình email, API sẽ báo lỗi rõ ràng và không lưu
tài khoản mời dở dang.

## API và bảo mật

Các endpoint Frontend được khai báo tại `backend/routes/api.php`. API dùng
session cookie `HttpOnly`/`SameSite=Lax` và bật `Secure` mặc định, cấp CSRF token qua
`GET /api/auth/csrf-token`, và yêu cầu header `X-CSRF-TOKEN` cho mọi request ghi.
Đặt `SESSION_SECURE=0` chỉ khi chạy HTTP local; luôn giữ `SESSION_SECURE=1`
khi chạy HTTPS. Phân quyền được kiểm tra phía Backend;
nhân viên chỉ xem đơn của mình, giá nhập/lợi nhuận chỉ trả cho admin. Tạo đơn
thanh toán cập nhật tồn kho trong transaction.

Luồng ứng dụng theo MVC: `routes/api.php` → `src/Controllers/` →
`src/Models/Model.php` → PDO/MySQL; JSON response trong `src/Core/Response.php`
đóng vai trò View cho API, còn các trang HTML/JS trong `frontend/` là giao diện.

## Cấu trúc dữ liệu

- `backend/database/schema.sql`: cấu trúc MySQL.
- `backend/database/seed.sql`: dữ liệu demo hiện có.
- `backend/public/uploads/`: ảnh avatar và mã QR; chỉ cho phép nội dung ảnh và cần quyền ghi cho PHP.
- `backend/public/`: front controller và rewrite rule cho Apache.
