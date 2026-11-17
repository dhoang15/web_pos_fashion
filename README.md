# B'TRIPLE POS

## 1. Mô tả ngắn và trạng thái dự án

Ứng dụng quản lý bán hàng thời trang với màn hình POS, quản lý sản phẩm, hóa
đơn, khách hàng, nhân viên, báo cáo và cấu hình cửa hàng.

> **Trạng thái:** Frontend Vanilla JavaScript và Backend PHP/PDO đã được tích hợp
> qua JSON API cùng origin.;
> có Docker Compose cho môi trường phát triển.

## Setup & Run nhanh (Docker)

### Yêu cầu

- Docker Desktop trên Windows/macOS, hoặc Docker Engine và Docker Compose Plugin
  trên Linux.
- Không cần cài PHP riêng khi chạy bằng Docker.

### Cài đặt và khởi chạy

Mở PowerShell tại thư mục gốc dự án:

```powershell
if (-not (Test-Path .env)) {
    Copy-Item docker.env.example .env
}
docker compose config --quiet
docker compose up --build -d
docker compose ps
```

Mở **<http://127.0.0.1:8000/>** sau khi service `app` và `db` chạy khỏe.
Đăng nhập môi trường demo bằng `admin` / `admin`; hãy đổi mật khẩu này trước
khi dùng dữ liệu thật hoặc chia sẻ môi trường. Không commit file `.env`.

### Database

- [`backend/database/schema.sql`](./backend/database/schema.sql) tạo database
  `fashion_pos_db` và các bảng.
- [`backend/database/seed.sql`](./backend/database/seed.sql) khởi tạo tài khoản
  quản trị demo `admin/admin`, 4 danh mục và 8 sản phẩm quần áo mẫu cho POS.
  Seed không tạo khách hàng hoặc hóa đơn giả.
- Docker tự chạy hai file SQL trên theo thứ tự khi khởi tạo volume MySQL mới.
  Volume đã có dữ liệu thì script không chạy lại; không xóa volume chỉ để nạp
  lại seed.

Muốn dừng ứng dụng mà vẫn giữ dữ liệu:

```powershell
docker compose down
```

Để xem hướng dẫn cài đặt không dùng Docker, cấu hình môi trường và xử lý sự cố,
xem [các bước chạy local](#7-cài-đặt-và-chạy-local) và [DOCKER.md](./DOCKER.md).

## 2. Mục lục

- [1. Mô tả ngắn và trạng thái dự án](#1-mô-tả-ngắn-và-trạng-thái-dự-án)
- [2. Mục lục](#2-mục-lục)
- [3. Tính năng chính](#3-tính-năng-chính)
- [4. Công nghệ](#5-công-nghệ)
- [5. Yêu cầu môi trường](#6-yêu-cầu-môi-trường)
- [6. Cài đặt và chạy local](#7-cài-đặt-và-chạy-local)
- [7. Biến môi trường](#8-biến-môi-trường)
- [8. Các lệnh](#9-các-lệnh)
- [9. Cấu trúc mã nguồn](#10-cấu-trúc-mã-nguồn)
- [10. Điều hướng và route](#11-điều-hướng-và-route)
- [11. Kiến trúc ứng dụng](#12-kiến-trúc-ứng-dụng)
- [12. Dữ liệu và localStorage](#13-dữ-liệu-và-localstorage)
- [13. API backend](#14-api-backend)
- [14. Tài khoản và quyền Admin](#15-tài-khoản-và-quyền-admin)
- [15. Docker và build production](#16-docker-và-build-production)
- [16. Kiểm thử](#17-kiểm-thử)
- [17. Giới hạn hiện tại](#18-giới-hạn-hiện-tại)
- [18. Hướng phát triển đề xuất](#19-hướng-phát-triển-đề-xuất)
- [20. Quy trình đóng góp](#20-quy-trình-đóng-góp)

## 3. Tính năng

- Đăng nhập và đăng xuất bằng PHP session.
- Vai trò `admin`, `staff`, `cashier`; backend kiểm tra quyền truy cập.
- POS: tra cứu sản phẩm, barcode, khách hàng, phương thức thanh toán, tạo và
  xem đơn.
- Quản lý sản phẩm, tồn kho, danh mục và mã QR thanh toán.
- Quản lý khách hàng và lịch sử đơn hàng.
- Danh sách hóa đơn, chi tiết đơn, báo cáo doanh thu.
- Quản lý nhân viên, trạng thái tài khoản và lời mời qua email.
- Nhân viên mới phải mở link mời còn hạn một phút, đăng nhập bằng MSSV trưởng
  nhóm làm mật khẩu tạm rồi đổi mật khẩu trước khi vào các chức năng khác.
- Cập nhật hồ sơ, avatar, mật khẩu và thiết lập cửa hàng.
- CSRF token cho request ghi; cookie session `HttpOnly`, `SameSite=Lax` và
  `Secure` mặc định.
- Kết nối MySQL local hoặc máy chủ từ xa qua PDO.

## 4. Công nghệ

| Nhóm | Công nghệ |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (không framework/bundler) |
| UI | Bootstrap 5.3.3, Bootstrap Icons 1.11.3 qua CDN |
| HTTP | Fetch API, JSON, session cookie cùng origin |
| Backend | PHP 8.1+ thuần, tổ chức MVC |
| Database | MySQL 8+ / MariaDB tương thích, PDO MySQL |
| Email | SMTP qua `backend/src/Core/SmtpMailer.php` |
| Web server phát triển | PHP built-in server và `backend/dev-router.php` |
| Container | Docker Compose, PHP CLI container và MySQL 8.4 |
| Package/build | Không dùng npm, Yarn, Composer hoặc build frontend |

## 5. Yêu cầu môi trường

- PHP 8.1 trở lên; bật các extension `pdo_mysql`, `fileinfo`, `mbstring`,
  `openssl`.
- MySQL 8+ hoặc MariaDB tương thích.
- XAMPP, Laragon hoặc PHP CLI riêng.
- Trình duyệt hiện đại.
- Internet để tải Bootstrap và Bootstrap Icons từ CDN.
- SMTP chỉ cần nếu sử dụng chức năng mời nhân viên qua email.

Phiên bản có thể kiểm tra bằng:

```powershell
php -v
php -m
```

## 6. Cài đặt và chạy local

### 6.1 Chuẩn bị project và PHP/MySQL

1. Clone hoặc giải nén dự án vào thư mục tùy chọn. Nếu dùng XAMPP/Laragon:
   - XAMPP: `C:\xampp\htdocs\web_pos_fashion`
   - Laragon: `C:\laragon\www\web_pos_fashion`
2. Khởi động MySQL trong XAMPP/Laragon.
3. Mở Terminal tại thư mục gốc của repository.

### 6.2 Tạo và nạp database

Có thể dùng phpMyAdmin:

1. Mở `http://localhost/phpmyadmin`.
2. Chọn **Import** và nạp `backend/database/schema.sql`. File này tạo database
   `fashion_pos_db` và các bảng.
3. Chọn database `fashion_pos_db`, nạp `backend/database/seed.sql` để tạo tài
   khoản quản trị demo `admin/admin`, danh mục và sản phẩm mẫu. Seed không tạo
   khách hàng hoặc hóa đơn giả.
4. Seed không phải script reset; có thể chạy lại để thêm các dòng dữ liệu mẫu
   đang thiếu mà không xóa hoặc ghi đè đơn hàng.

Hoặc dùng MySQL CLI từ thư mục gốc:

```powershell
mysql -u root -p < backend\database\schema.sql
mysql -u root -p fashion_pos_db < backend\database\seed.sql
```

Nếu MySQL local không đặt mật khẩu, bỏ `-p`; nếu đặt, CLI sẽ yêu cầu mật khẩu.

### 6.3 Cấu hình database

Tạo file `backend/.env` (file này bị Git ignore) và cấu hình tối thiểu:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=fashion_pos_db
DB_USERNAME=root
DB_PASSWORD=
DB_CHARSET=utf8mb4
DB_SSL_CA=
SESSION_SECURE=0
APP_URL=http://127.0.0.1:8000
```

Thay `DB_USERNAME`/`DB_PASSWORD` theo MySQL local của bạn. Không dùng
`SESSION_SECURE=0` ngoài môi trường HTTP local.

### 6.4 Chạy ứng dụng

Từ thư mục gốc:

```powershell
php -S 127.0.0.1:8000 -t frontend backend/dev-router.php
```

Nếu PHP XAMPP chưa có trong `PATH`:

```powershell
& "C:\xampp\php\php.exe" -S 127.0.0.1:8000 -t frontend backend/dev-router.php
```

Mở **<http://127.0.0.1:8000/>**. Giữ Terminal đang chạy server; nhấn `Ctrl+C`
để dừng. Không mở HTML trực tiếp bằng `file://`.

> Dự án không có npm script `dev`/`build`. Không nên chạy trực tiếp Apache với
> URL `/web_pos_fashion/` nếu chưa thiết lập VirtualHost/rewrite; router phát
> triển trên xử lý cả Frontend, `/api/*` và `/uploads/` theo cùng origin.

### 6.5 Reset dữ liệu local

Không có lệnh reset dữ liệu tự động. Muốn làm lại từ đầu, trước tiên export
backup database cần giữ lại. Sau đó, trong phpMyAdmin, chỉ xóa database local
`fashion_pos_db`, tạo/import lại `schema.sql` và import `seed.sql` đúng một lần.
Thao tác xóa database sẽ mất toàn bộ dữ liệu đơn hàng, khách hàng, tài khoản và
cài đặt trong database đó; xác nhận đã chọn đúng database trước khi thực hiện.

### 6.6 Chạy toàn bộ stack bằng Docker

Cần cài Docker Desktop (Windows/macOS) hoặc Docker Engine cùng Docker Compose
Plugin (Linux), sau đó mở Docker daemon.

Từ PowerShell tại thư mục gốc repository:

```powershell
if (-not (Test-Path .env)) {
    Copy-Item docker.env.example .env
}
docker compose up --build -d
docker compose ps
```

Mở **<http://127.0.0.1:8000/>**. Compose khởi tạo container PHP và MySQL; khi
database volume được tạo lần đầu, MySQL tự chạy `schema.sql` rồi `seed.sql`.
Ứng dụng chỉ khởi động sau khi MySQL health check thành công.

Các biến database trong `.env` là bắt buộc; Compose dừng và báo tên biến nếu
thiếu. Giá trị mẫu trong `docker.env.example` chỉ dành cho thử nghiệm local.
Trước khi dùng ngoài localhost, thay cả hai mật khẩu
`MYSQL_PASSWORD` và `MYSQL_ROOT_PASSWORD` trong file `.env`. Không commit file
`.env`. SMTP là tùy chọn; thêm credential SMTP vào file `.env` nếu cần gửi lời
mời nhân viên.

Xem log:

```powershell
docker compose logs -f app
docker compose logs -f db
```

Dừng stack và giữ nguyên dữ liệu:

```powershell
docker compose down
```

`mysql_data` lưu database và `uploads` lưu ảnh upload trong Docker named volumes;
`docker compose down` không xóa chúng. Để khởi tạo schema/seed lại, cần chủ động
xóa volume database (việc này xóa toàn bộ dữ liệu local trong volume):

```powershell
docker compose down
docker volume ls
docker volume rm <TEN_VOLUME_MYSQL_CUA_DU_AN>
docker compose up --build -d
```

Xác định đúng tên volume trước khi xóa; không xóa volume nếu cần giữ dữ liệu.
MySQL không tự chạy lại file init khi volume đã được khởi tạo.

## 7. Biến môi trường

Backend đọc `backend/.env` qua `backend/config/env.php`. Không commit file này,
không ghi credential thật trong issue, chat hoặc log.

| Biến | Bắt buộc | Mô tả |
|---|---:|---|
| `DB_HOST` | Không¹ | Host MySQL; mặc định `127.0.0.1` |
| `DB_PORT` | Không¹ | Cổng MySQL; mặc định `3306` |
| `DB_DATABASE` | Không¹ | Tên database; mặc định `fashion_pos_db` |
| `DB_USERNAME` | Không¹ | MySQL user; mặc định `root` |
| `DB_PASSWORD` | Không¹ | Mật khẩu MySQL; mặc định rỗng |
| `DB_CHARSET` | Không | Charset; mặc định `utf8mb4` |
| `DB_SSL_CA` | Không | Đường dẫn tuyệt đối đến CA certificate nếu MySQL yêu cầu TLS |
| `SESSION_NAME` | Không | Tên session cookie; mặc định `btriple_pos` |
| `SESSION_SECURE` | Không | Cookie chỉ gửi qua HTTPS; mặc định bật. Tắt (`0`) chỉ cho HTTP local |
| `APP_URL` | Khi gửi thư | URL gốc được dùng để tạo link mời |
| `STAFF_TEMP_PASSWORD` | Khi mời nhân viên | MSSV trưởng nhóm dùng làm mật khẩu tạm; Docker mẫu hiện đặt `52400269` |
| `SMTP_HOST` | Khi gửi thư | SMTP server, ví dụ `smtp.gmail.com` |
| `SMTP_PORT` | Khi gửi thư | Cổng SMTP, thường `587` cho STARTTLS |
| `SMTP_ENCRYPTION` | Khi gửi thư | `tls` (STARTTLS) hoặc `ssl` |
| `SMTP_USERNAME` | Khi gửi thư | Tài khoản SMTP |
| `SMTP_PASSWORD` | Khi gửi thư | SMTP password/App Password |
| `MAIL_FROM` | Khi gửi thư | Địa chỉ email gửi |

Các biến `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` và
`MYSQL_ROOT_PASSWORD` trong root `.env` là bắt buộc cho Docker Compose. Không
đặt SMTP thì tính năng mời nhân viên qua email không hoạt động.

Với Docker, sửa file `.env` ở **thư mục gốc**, cùng cấp `compose.yaml`
(`backend/.env` không được Compose dùng để cấp SMTP cho container). Gmail cần
bật xác minh 2 bước rồi tạo **App Password**; không dùng mật khẩu đăng nhập
Google. Điền App Password vào `SMTP_PASSWORD` (có thể nhập liền 16 ký tự):

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_ENCRYPTION=tls
SMTP_USERNAME=you@gmail.com
SMTP_PASSWORD=your-16-character-app-password
MAIL_FROM=you@gmail.com
```

`SMTP_USERNAME` và `MAIL_FROM` phải là hộp thư đã cấp App Password. Sau khi lưu
`.env`, tạo lại riêng container ứng dụng để nạp cấu hình mới (không cần xóa
volume hoặc khởi tạo lại database):

```powershell
docker compose config --quiet
docker compose up -d --force-recreate app
```

Sau đó đăng nhập QTV, mở **Nhân viên**, tạo nhân viên mới với địa chỉ Gmail
thật mà bạn có thể nhận thư. Ứng dụng chỉ chấp nhận email nhân viên dạng
`@gmail.com`; nếu gửi thành công, mở liên kết trong vòng một phút, đăng nhập
bằng tên đăng nhập và mật khẩu tạm là MSSV trưởng nhóm, sau đó tạo mật khẩu mới.
Không gửi App Password qua chat, không commit `.env`.
`APP_URL=http://127.0.0.1:8000` chỉ dùng được khi người nhận mở liên kết trên
cùng máy; nếu nhân viên dùng thiết bị khác, cần URL HTTPS công khai mà thiết bị
đó truy cập được.

## 8. Các lệnh

Không có lệnh npm/Yarn vì Frontend không dùng Node package manager.

| Tác vụ | Lệnh |
|---|---|
| Khởi động local | `php -S 127.0.0.1:8000 -t frontend backend/dev-router.php` |
| Kiểm tra PHP | `php -v` |
| Kiểm tra extension | `php -m` |
| Kiểm tra kết nối MySQL | `php -r "require 'backend/src/bootstrap.php'; App\Core\Database::connection(); echo 'MySQL connection: OK', PHP_EOL;"` |
| Kiểm tra cú pháp một file PHP | `php -l backend\src\Controllers\AuthController.php` |
| Kiểm tra cú pháp JavaScript | `node --check frontend\assets\js\api.js` (Node chỉ cần cho bước kiểm tra này) |
| Import schema | `mysql -u root -p < backend\database\schema.sql` |
| Tạo tài khoản admin demo | `mysql -u root -p fashion_pos_db < backend\database\seed.sql` |
| Build và chạy Docker | `docker compose up --build -d` |
| Trạng thái container | `docker compose ps` |
| Theo dõi log | `docker compose logs -f app` |
| Dừng Docker (giữ dữ liệu) | `docker compose down` |
| npm / Yarn | Không áp dụng; repository không có `package.json` hoặc frontend bundler |
| Dừng server | `Ctrl+C` trong Terminal đang chạy server |

Không có `npm run build`, `npm test` hay `yarn build` trong repository hiện tại.

## 9. Cấu trúc mã nguồn

```text
web_pos_fashion/
├── backend/
│   ├── config/
│   │   ├── app.php                 # session, upload
│   │   ├── database.php            # cấu hình PDO từ .env
│   │   └── env.php                 # nạp biến môi trường
│   ├── database/
│   │   ├── schema.sql              # tạo database và bảng
│   │   └── seed.sql                # dữ liệu ban đầu
│   ├── public/
│   │   ├── index.php               # API front controller
│   │   └── uploads/                # ảnh upload runtime
│   ├── routes/
│   │   └── api.php                 # khai báo API routes
│   ├── src/
│   │   ├── Controllers/            # nghiệp vụ theo module
│   │   ├── Core/                   # Request, Router, PDO, Response, SMTP
│   │   ├── Middlewares/            # session, role, CSRF
│   │   ├── Models/                 # lớp truy cập dữ liệu
│   │   └── bootstrap.php           # autoload PHP
│   └── dev-router.php              # phục vụ frontend và chuyển API local
├── frontend/
│   ├── assets/
│   │   ├── css/                    # style dùng chung
│   │   └── js/
│   │       ├── api.js              # Fetch wrapper và CSRF
│   │       └── common.js           # shell, quyền hiển thị, helpers
│   ├── components/                 # header, sidebar, footer
│   ├── pages/
│   │   ├── auth/                   # login, first-login
│   │   ├── categories/
│   │   ├── customers/
│   │   ├── invoices/
│   │   ├── pos/
│   │   ├── products/
│   │   ├── profile/
│   │   ├── reports/
│   │   ├── settings/
│   │   └── users/
│   └── index.html                  # dashboard/điểm vào
├── .gitignore
└── README.md
```

## 10. Điều hướng và route

Đây là các trang HTML tĩnh điều hướng bằng URL; dự án không dùng React Router,
Vue Router hoặc client-side SPA router.

| Trang | URL local | Quyền giao diện |
|---|---|---|
| Dashboard | `/` hoặc `/index.html` | Admin, staff, cashier |
| Đăng nhập | `/pages/auth/login.html` | Công khai |
| Đặt mật khẩu lần đầu | `/pages/auth/first-login.html` | Nhân viên vừa dùng link mời đăng nhập hoặc admin cần đổi mật khẩu |
| POS | `/pages/pos/index.html` | Admin, staff, cashier |
| Hóa đơn | `/pages/invoices/index.html` | Admin, staff, cashier |
| Sản phẩm | `/pages/products/index.html` | Admin, staff, cashier |
| Danh mục | `/pages/categories/index.html` | Giao diện theo role; thao tác ghi được Backend giới hạn admin |
| Khách hàng | `/pages/customers/index.html` | Admin, staff, cashier |
| Báo cáo | `/pages/reports/index.html` | Admin, staff, cashier; dữ liệu phạm vi theo role |
| Nhân viên | `/pages/users/index.html` | Admin |
| Cài đặt | `/pages/settings/index.html` | Admin |
| Hồ sơ | `/pages/profile/index.html` | Tài khoản đăng nhập |

Ẩn/hiện điều hướng ở Frontend phục vụ trải nghiệm người dùng; quyền thật luôn
được kiểm tra lại trong Backend.

## 11. Kiến trúc ứng dụng

### Frontend

- Mỗi trang là HTML/CSS/JavaScript độc lập trong `frontend/pages/`.
- `frontend/assets/js/common.js` tải header, sidebar, footer; áp dụng điều hướng
  theo vai trò và cung cấp helper như `unwrapList()`, `notify()`.
- `frontend/assets/js/api.js` cung cấp `PosApi.get/post/put/delete/upload`, quản
  lý JSON, session cookie cùng origin, CSRF và lỗi HTTP.
- Không có React/Vue App shell, Context, Hooks, state library hoặc bundler. Shell
  dùng các component HTML và IIFE/global helper để giữ JavaScript thuần.

### Backend

Luồng request:

```text
dev-router.php
  -> public/index.php
  -> CsrfMiddleware
  -> routes/api.php / Router
  -> AuthMiddleware / RoleMiddleware
  -> Controllers
  -> Models / Database (PDO)
  -> MySQL
```

Response JSON được tạo qua `backend/src/Core/Response.php`. Request lỗi nghiệp vụ
dùng `ApiException`; lỗi không xử lý được ghi server log và trả response chung,
không trả stack trace cho trình duyệt.

## 12. Dữ liệu và localStorage

Frontend **không dùng `localStorage`**. Một số thông tin giao diện được giữ trong
`sessionStorage` để tồn tại khi chuyển trang cùng tab; chúng không phải nguồn
xác thực hoặc phân quyền.

| Key | Mục đích |
|---|---|
| `pos-role` | Vai trò để dựng menu/điều hướng |
| `pos-user-name` | Tên hiển thị người dùng |
| `pos-user-id` | ID hiển thị/phục vụ bộ lọc UI |
| `pos-first-login` | Đánh dấu trạng thái đổi mật khẩu lần đầu trong UI |
| `pos-first-login-role` | Vai trò tạm khi xử lý luồng đổi mật khẩu lần đầu |

Các key bị xóa khi đăng xuất hoặc hoàn thành luồng first-login. Backend vẫn đọc
user/role/status từ session server và MySQL cho mỗi request bảo vệ; chỉnh sửa
`sessionStorage` bằng DevTools không cấp quyền Backend.

Dữ liệu bền vững như user, sản phẩm, tồn kho, đơn hàng, khách hàng, cài đặt và
QR nằm trong MySQL. Ảnh upload được lưu trong `backend/public/uploads/`.

## 13. API backend

Base URL local: `http://127.0.0.1:8000/api`. API thành công trả `{ "data": ... }`;
lỗi trả `{ "error": { "code": "...", "message": "...", "details": {} } }`.

| Endpoint | Controller | Xác thực / ghi chú |
|---|---|---|
| `GET /auth/csrf-token` | `AuthController` | Cấp CSRF token trong session |
| `POST /auth/login` | `AuthController` | Công khai; vẫn cần CSRF |
| `POST /auth/logout` | `AuthController` | Session |
| `GET /auth/me` | `AuthController` | Session |
| `POST /auth/invitations/login` | `AuthController` | Không cần login; CSRF, token 1 phút và MSSV tạm hợp lệ |
| `POST /auth/first-login` | `AuthController` | Session first-login |
| `POST /auth/change-password` | `AuthController` | Session |
| `GET /products`, `POST /products` | `ProductController` | Đọc cần session; tạo chỉ admin |
| `PUT/POST/DELETE /products/{id}` | `ProductController` | Chỉ admin; POST cập nhật hỗ trợ upload |
| `GET/POST /categories`, `PUT/DELETE /categories/{id}` | `CategoryController` | Đọc cần session; ghi chỉ admin |
| `GET /customers`, `GET /customers/lookup` | `CustomerController` | Session; khách mới phát sinh theo đơn POS |
| `GET/POST /orders`, `GET/PUT /orders/{id}` | `OrderController` | Session; giới hạn truy cập đơn theo role/user |
| `GET /customers/{id}/orders?page=1&per_page=20` | `OrderController` | Session; phân trang lịch sử (tối đa 100 đơn/trang), trả `orders` và metadata `pagination` |
| `GET /reports/sales` | `ReportController` | Session; phạm vi dữ liệu theo role |
| `GET/POST /users`, `PUT /users/{id}/status` | `UserController` | Chỉ admin |
| `POST /users/{id}/resend-invitation` | `UserController` | Chỉ admin; SMTP cần cấu hình |
| `GET/PUT /store_settings` | `SettingController` | Đọc cần session; ghi chỉ admin |
| `GET/POST /payment_qrcodes`, `PUT /payment_qrcodes/{id}` | `SettingController` | Đọc cần session; ghi chỉ admin |
| `PUT/POST /auth/profile` | `AuthController` | Session; POST hỗ trợ multipart/avatar |

Mọi request thay đổi dữ liệu cần header `X-CSRF-TOKEN`. Frontend lấy token tự
động từ `GET /api/auth/csrf-token`. Ứng dụng hiện cùng origin nên không bật CORS.
Lịch sử đơn hàng khách hàng nhận `page` (mặc định `1`) và `per_page` (mặc định
`20`, tối đa `100`); response chứa `pagination.page`, `pagination.per_page`,
`pagination.total` và `pagination.total_pages`.

## 14. Tài khoản và quyền Admin

- Role hiện có: `admin`, `staff`, `cashier`.
- Theo tài liệu yêu cầu demo, seed cung cấp tài khoản `admin` với mật khẩu
  `admin`. Chỉ dùng credential này cho môi trường demo/local; hãy đổi sang mật
  khẩu mạnh trước khi triển khai hoặc dùng dữ liệu thật.
- Seed tạo tài khoản admin cùng danh mục/sản phẩm quần áo mẫu để demo POS. Khách
  hàng sẽ được tạo khi thanh toán; báo cáo có dữ liệu sau khi phát sinh đơn hàng.
- Seed không tạo sẵn nhân viên. Đăng nhập bằng admin, cấu hình SMTP rồi tạo nhân
  viên từ trang quản lý để kiểm tra lời mời email và token dùng một lần theo rubric.
- Mật khẩu tạm của nhân viên lấy từ `STAFF_TEMP_PASSWORD`; mẫu Docker được đặt
  bằng MSSV trưởng nhóm `52400269`. Thay giá trị này trong `.env` nếu thông tin
  nhóm thay đổi. Nhân viên buộc đổi sang mật khẩu riêng sau lần đăng nhập đầu.
- Seed kích hoạt sẵn tài khoản này cho database khởi tạo mới. Với database đã
  tồn tại, seed không tự chạy lại; để áp dụng credential demo, chạy SQL sau
  trong đúng database:

```sql
UPDATE users
SET password = '$2y$10$6UDgpBGj.Zuou.vgnfYWMuBeqqTVVs8dyOAAScP8cD1yrkUB6kUHC',
    status = 'active',
    is_first_login = 0,
    login_token = NULL,
    token_time = NULL
WHERE username = 'admin' AND role = 'admin';
```

Nếu muốn đổi mật khẩu demo, tạo hash bằng PHP trong PowerShell. Nhập mật khẩu ở
dấu nhắc ẩn; mật khẩu không nằm trực tiếp trong lệnh:

```powershell
$securePassword = Read-Host "Mat khau admin moi" -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:POS_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
    $passwordHash = php -r 'echo password_hash(getenv("POS_ADMIN_PASSWORD"), PASSWORD_DEFAULT);'
} finally {
    Remove-Item Env:POS_ADMIN_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
    $securePassword.Dispose()
}
$passwordHash
```

Sao chép hash đầu ra vào MySQL. Thay thông tin ví dụ bằng giá trị của bạn; mật
khẩu cần tối thiểu 12 ký tự:

```sql
UPDATE users
SET username = 'owner',
    email = 'owner@example.com',
    password = '<PASSWORD_HASH>',
    first_name = 'Ten',
    last_name = 'QuanTri',
    status = 'active',
    is_first_login = 0,
    login_token = NULL,
    token_time = NULL
WHERE role = 'admin' AND username = 'admin';
```

Nếu không có hàng seed `admin`, chèn user mới:

```sql
INSERT INTO users
    (username, email, password, role, first_name, last_name, status, is_first_login)
VALUES
    ('owner', 'owner@example.com', '<PASSWORD_HASH>', 'admin', 'Ten', 'QuanTri', 'active', 0);
```

Username/email phải chưa tồn tại. Không lưu mật khẩu rõ trong database, source
code hoặc Git.

## 15. Docker và build production

- Hướng dẫn Docker chuyên sâu, giải thích Dockerfile/Compose, network, volume,
  lệnh thường dùng và xử lý sự cố: [DOCKER.md](./DOCKER.md).
- `Dockerfile` tạo PHP CLI image có `pdo_mysql` và `mbstring`, sau đó chạy
  `backend/dev-router.php` để phục vụ Frontend, API và uploads cùng origin.
- `compose.yaml` chạy hai service: `app` (PHP) và `db` (MySQL 8.4). MySQL chỉ
  được expose trong Docker network; app publish trên loopback host port `8000`.
- `docker.env.example` là mẫu biến môi trường Compose; copy thành `.env` ở thư
  mục gốc trước khi chạy. `.dockerignore` loại Git, env/secrets và upload runtime
  khỏi image build context.
- Compose tự import `schema.sql` và `seed.sql` **chỉ khi MySQL data volume mới
  được tạo**. Các lần chạy sau giữ dữ liệu trong named volume.
- Frontend vẫn được phục vụ trực tiếp từ HTML/CSS/JS; không có bước Vite/Webpack
  hoặc npm build.
- PHP built-in server trong image chỉ phù hợp chạy local/demo, không phải
  production-grade web server. Triển khai production nên đặt sau Apache/Nginx
  hoặc reverse proxy TLS, không public MySQL, bảo vệ file `.env`, giới hạn upload.
- Production cần đặt `SESSION_SECURE=1`, bảo vệ quyền truy cập thư mục upload,
  dùng MySQL user riêng có quyền tối thiểu và quản lý SMTP credential an toàn.
- Mật khẩu mẫu trong `docker.env.example` chỉ dùng localhost; phải thay trước
  khi publish hoặc chia sẻ môi trường.

## 16. Kiểm thử

Hiện repository không khai báo PHPUnit, Jest, Vitest, Playwright hay test runner
riêng. Có thể kiểm tra thủ công:

1. Kiểm tra kết nối PDO bằng lệnh ở mục [Các lệnh](#9-các-lệnh).
2. Mở dashboard và login; kiểm tra role admin/staff/cashier.
3. Thử POS: tìm sản phẩm, tạo đơn, kiểm tra tồn kho và hóa đơn trên MySQL.
4. Thử quản lý sản phẩm/danh mục/user với admin; xác nhận tài khoản thường bị
   Backend từ chối khi gọi route admin.
5. Kiểm tra request ghi thiếu CSRF header bị trả `403`.
6. Cấu hình SMTP staging/test trước khi gửi lời mời thật; kiểm tra token hết hạn,
   dùng một lần, mật khẩu tạm và buộc đổi mật khẩu lần đầu.

Kiểm tra cú pháp PHP/JavaScript (nếu đã cài Node cho bước JS):

```powershell
php -l backend\src\Controllers\AuthController.php
node --check frontend\assets\js\api.js
```

Các lệnh này kiểm tra cú pháp, không thay thế integration test nghiệp vụ hoặc
kiểm thử trên MySQL.

## 17. Giới hạn hiện tại

- Không có React/Vue, SPA router, frontend build tool, package manager hoặc
  automated test suite.
- Trang được điều hướng bằng file HTML riêng; có thể trùng lặp markup giữa trang.
- Bootstrap/Bootstrap Icons tải qua CDN, nên cần Internet để có đầy đủ UI.
- CORS không được bật; thiết kế yêu cầu cùng origin cho session cookie và CSRF.
- SMTP cần người triển khai tự cấu hình; chưa thể đảm bảo email gửi thành công
  nếu credential hoặc chính sách nhà cung cấp chưa thiết lập.
- Dữ liệu seed chỉ phục vụ demo/local: tạo admin `admin/admin`, 4 danh mục và
  8 sản phẩm mẫu; không dùng dữ liệu này cho cửa hàng thật.
- PHP built-in server chỉ phục vụ phát triển, không thay thế web server production.
- Frontend `sessionStorage` chỉ phục vụ UI; mọi kiểm soát bảo mật phải tiếp tục ở
  Backend.

## 18. Hướng phát triển đề xuất

1. Thêm test integration cho đăng nhập, CSRF, quyền, đơn hàng/tồn kho và mời user.
2. Thêm health check và quy trình migration database có backup/rollback.
3. Tách cấu hình theo môi trường local/staging/production và quản lý secrets.
4. Bổ sung logging/monitoring SMTP, database và lỗi API nhưng tuyệt đối không ghi
   password/token.
5. Thiết lập pipeline lint, security checks và test trước deploy.
6. Nếu quy mô giao diện tăng, cân nhắc framework hoặc build pipeline như một thay
   đổi kiến trúc riêng, không áp dụng npm script giả khi chưa thêm tooling.

## 19. Quy trình đóng góp

1. Tạo branch theo thay đổi, ví dụ `feature/customer-search` hoặc
   `fix/session-timeout`.
2. Giữ các thay đổi tập trung; không commit `.env`, mật khẩu, App Password,
   database dump chứa dữ liệu cá nhân hoặc file upload runtime.
3. Khi sửa API, cập nhật đồng thời route, Controller, Frontend caller và bảng API
   trong README.
4. Giữ nhất quán response `{ "data": ... }` và error envelope của API.
5. Chạy `php -l` cho PHP, `node --check` cho JavaScript có thay đổi, kiểm tra
   luồng trên local và `git diff --check`.
6. Mô tả rõ hành vi thay đổi, kiểm thử đã chạy và cấu hình/migration cần thiết
   trong pull request.
