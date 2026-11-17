# Docker trong dự án B'TRIPLE POS

Tài liệu này giải thích cách Docker được dùng trong repository, cách chạy stack
trên Windows/PowerShell, ý nghĩa các file cấu hình và các lệnh Docker thường dùng
để phát triển, kiểm tra và xử lý sự cố.

> Hướng dẫn tập trung vào Docker Engine và Docker Compose của dự án này; đây
> không phải danh mục mọi lệnh Docker tồn tại. Các lệnh có khả năng xóa dữ liệu
> được đánh dấu rõ ràng. Không chạy chúng nếu chưa hiểu ảnh hưởng.

## Mục lục

1. [Docker là gì?](#1-docker-là-gì)
2. [Docker trong repository](#2-docker-được-dùng-thế-nào-trong-repository)
3. [Service, cổng, network và dữ liệu](#3-service-cổng-network-và-dữ-liệu)
4. [Khởi chạy trên Windows](#4-khởi-chạy-lần-đầu-trên-windows)
5. [Từ khóa Docker](#5-từ-khóa-trong-lệnh-docker)
6. [Lệnh Docker Engine](#6-các-lệnh-docker-engine-thường-dùng)
7. [Lệnh Docker Compose](#7-các-lệnh-docker-compose-của-dự-án)
8. [Backup và phục hồi](#8-backup-và-phục-hồi-database-container)
9. [Troubleshooting](#9-troubleshooting)
10. [Dọn dẹp và rủi ro](#10-các-lệnh-dọn-dẹp-và-rủi-ro)
11. [Giới hạn hiện tại](#11-giới-hạn-sử-dụng-hiện-tại)
12. [Bảng lệnh nhanh](#12-bảng-lệnh-tham-khảo-nhanh)

## 1. Docker là gì?

- **Docker Engine** chạy container và quản lý image, network, volume. Trên
  Windows, Docker Desktop thường cung cấp Docker Engine.
- **Image** là mẫu đóng gói hệ điều hành/thư viện/mã cần thiết để chạy ứng dụng.
- **Container** là một tiến trình ứng dụng đang chạy từ image, được cô lập với
  máy host ở mức hệ điều hành.
- **Dockerfile** mô tả cách tạo image.
- **Docker Compose** khai báo và quản lý nhiều service cùng lúc trong file YAML.
- **Volume** lưu dữ liệu ngoài vòng đời container, ví dụ dữ liệu MySQL.
- **Network** cho phép các container trong cùng Compose project giao tiếp bằng
  tên service.

Một container có thể bị thay thế khi cập nhật hoặc tạo lại. Vì vậy dữ liệu cần
giữ phải nằm trong volume, không chỉ nằm trong filesystem của container.

## 2. Docker được dùng thế nào trong repository?

```text
Trình duyệt trên máy host
  │ http://127.0.0.1:8000
  ▼
app (PHP 8.2 CLI, container)
  ├── PHP built-in server :8000
  ├── frontend/                         HTML, CSS, JavaScript
  ├── backend/dev-router.php             định tuyến file tĩnh/API/upload
  ├── backend/public/index.php            khởi tạo session, CSRF, API
  ├── backend/src/                        Controller, Core, Middleware, Model
  ├── backend/public/uploads/             volume uploads
  └── MySQL qua network nội bộ ───────────────┐
                                               ▼
                                      db (MySQL 8.4)
                                        └── volume mysql_data
```

### Các file Docker

| File/thư mục | Vai trò trong dự án |
|---|---|
| [`Dockerfile`](./Dockerfile) | Tạo image PHP 8.2 CLI; cài `pdo_mysql`, `mbstring`; sao chép mã nguồn; chạy PHP built-in server cổng 8000. |
| [`compose.yaml`](./compose.yaml) | Khai báo hai service `app`, `db`; cấu hình biến môi trường, health check, cổng và volume. |
| [`.dockerignore`](./.dockerignore) | Loại `.env`, log, upload runtime, PDF tài liệu/đánh giá và artefact khỏi build context để tránh đóng gói dữ liệu/credential không cần cho runtime. |
| [`docker.env.example`](./docker.env.example) | Mẫu biến môi trường cho Compose. Sao chép thành `.env` tại thư mục gốc để chạy local. |
| [`backend/database/schema.sql`](./backend/database/schema.sql) | Được MySQL image thực thi khi khởi tạo datadir mới. |
| [`backend/database/seed.sql`](./backend/database/seed.sql) | Tạo admin demo, 4 danh mục và 8 sản phẩm mẫu; chạy sau schema khi khởi tạo datadir mới. |
| `mysql_data` | Named volume chứa dữ liệu database lâu dài. |
| `uploads` | Named volume chứa ảnh được upload trong ứng dụng. |

### Vị trí thư mục

```text
repository-root/
├── Dockerfile
├── compose.yaml
├── .dockerignore
├── docker.env.example
├── frontend/
│   ├── index.html
│   ├── assets/
│   └── pages/
└── backend/
    ├── dev-router.php
    ├── config/
    ├── database/
    │   ├── schema.sql
    │   └── seed.sql
    ├── public/
    │   ├── index.php
    │   └── uploads/
    ├── routes/
    └── src/
```

Build context là thư mục gốc (`.`), nên Dockerfile có thể sao chép cả `frontend/`
và `backend/`. File cấu hình database của ứng dụng nằm trong `backend/config/`;
Compose truyền thông tin kết nối cho PHP bằng environment variables.

## 3. Service, cổng, network và dữ liệu

### Service `app`

- Chạy PHP built-in web server trong container tại `0.0.0.0:8000`.
- Publish cổng container `8000` ra `127.0.0.1:8000` trên máy host. Vì chỉ bind
  loopback, service không tự mở cổng này cho các máy khác trong mạng.
- Nói chuyện với database bằng hostname `db` và cổng nội bộ `3306`. `db` là tên
  service Compose, không phải địa chỉ máy host.
- Gắn named volume `uploads` tại `/app/backend/public/uploads`.

### Service `db`

- Dùng image `mysql:8.4`.
- Cổng `3306` không publish ra host; chỉ `app` và các container trong network
  Compose truy cập trực tiếp.
- Gắn named volume `mysql_data` tại `/var/lib/mysql`.
- Mount schema và seed ở chế độ chỉ đọc vào
  `/docker-entrypoint-initdb.d/`. MySQL image chạy các script này khi datadir
  còn mới; thay đổi các file SQL không tự chạy lại trên database đã có dữ liệu.
- Health check dùng để Compose đợi MySQL sẵn sàng trước khi khởi động `app`.

### Biến môi trường và thông tin nhạy cảm

Compose đọc `.env` ở thư mục gốc để thay `${VARIABLE}` trong `compose.yaml`.
`docker.env.example` chỉ là file mẫu, Compose không tự đọc file đó.
`MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` và `MYSQL_ROOT_PASSWORD` phải
có giá trị; Compose báo lỗi nếu thiếu. `SESSION_SECURE` và `APP_URL` có giá trị
phù hợp để chạy local. Có thể để các biến SMTP trống nếu chưa dùng email; khi
đó ứng dụng vẫn chạy nhưng chức năng gửi thư mời không hoạt động.
`STAFF_TEMP_PASSWORD` mặc định là MSSV trưởng nhóm `52400269`; nếu mã này thay
đổi, cập nhật biến trong root `.env` trước khi tạo hoặc gửi lại lời mời nhân viên.

Trên PowerShell, tạo `.env` chỉ khi chưa có file để tránh ghi đè cấu hình local:

```powershell
if (-not (Test-Path .env)) {
    Copy-Item docker.env.example .env
} else {
    Write-Host ".env đã tồn tại; giữ nguyên file hiện tại."
}
```

Không commit `.env`, không đưa SMTP password hoặc credential thật vào image.
Mật khẩu mẫu trong `docker.env.example` chỉ dành cho local thử nghiệm; thay
chúng trước khi chia sẻ máy hoặc đưa stack lên môi trường khác.

## 4. Khởi chạy lần đầu trên Windows

### Điều kiện

1. Cài Docker Desktop và bật Docker Engine.
2. Mở PowerShell tại thư mục gốc repository.
3. Tạo `.env` từ `docker.env.example` nếu chưa có.
4. Kiểm tra Docker CLI và Compose:

```powershell
docker --version
docker compose version
docker info
```

`docker info` cần kết nối được tới Docker daemon. Nếu báo lỗi kết nối pipe,
hãy mở Docker Desktop, đợi Engine khởi động rồi chạy lại lệnh.

### Build và chạy ứng dụng

```powershell
docker compose config --quiet
docker compose up --build -d
docker compose ps
```

Sau khi service `app` và `db` đã chạy, mở:

```text
http://127.0.0.1:8000/
```

`docker compose up --build -d` sẽ build/cập nhật image khi cần và chạy các
container ở chế độ nền. Lần đầu, MySQL tạo database, bảng và tài khoản admin
demo, 4 danh mục và 8 sản phẩm mẫu nếu named volume `mysql_data` còn rỗng. Seed
không tạo khách hàng hoặc hóa đơn giả. Kiểm tra log nếu `app` chưa sẵn sàng:

```powershell
docker compose logs --tail 100 db
docker compose logs --tail 100 app
```

## 5. Từ khóa trong lệnh Docker

| Từ khóa | Ý nghĩa |
|---|---|
| `docker` | Điều khiển Docker Engine và đối tượng như image/container/volume. |
| `docker compose` | Điều khiển các service được khai báo trong Compose project. |
| `build` | Đọc Dockerfile và tạo image. |
| `up` | Tạo (nếu cần) và khởi động service, network, volume cần thiết. |
| `down` | Dừng và xóa container/network do Compose tạo; mặc định giữ named volume. |
| `-d` | Detached mode: chạy nền và trả terminal về ngay. |
| `-f` | Theo dõi log liên tục (follow); nhấn `Ctrl+C` để ngừng theo dõi. |
| `-p` | Chọn project name của Compose, ảnh hưởng tiền tố tên resource. |
| `--build` | Build image trước khi khởi động `up`. |
| `--tail N` | Chỉ hiển thị N dòng log cuối. |
| `--rm` | Xóa container tạm sau khi lệnh `run` kết thúc. |
| `-v` | Tùy lệnh: thường chỉ định volume mount hoặc xóa named volume. Đọc lệnh trước khi chạy. |

Đặt các tùy chọn ở đúng vị trí. Ví dụ `docker compose logs -f app` có nghĩa là
theo dõi log của service `app`; còn `docker compose up -d` khởi động nền.

## 6. Các lệnh Docker Engine thường dùng

### Phiên bản, daemon, cấu hình

```powershell
docker --version
docker version
docker info
```

- `docker --version`: phiên bản CLI trên máy.
- `docker version`: phiên bản client và server; hữu ích để phân biệt CLI có sẵn
  nhưng daemon chưa chạy.
- `docker info`: trạng thái Engine, driver lưu trữ, số lượng container/image và
  thông tin runtime.

### Image

```powershell
docker image ls
docker image inspect php:8.2-cli
docker image pull mysql:8.4
docker image history btriple-pos-app
```

- **Image** là khuôn để tạo container; xóa container không đồng nghĩa xóa image.
- `docker image ls`: liệt kê image local.
- `docker image inspect`: xem metadata, layers, architecture và cấu hình image.
- `docker image pull`: tải image từ registry. Compose tự pull image `mysql:8.4`
  nếu máy chưa có.
- `docker image history`: xem các layer đã tạo nên image.
- `docker image prune`: dọn image dangling không còn được tham chiếu; thường
  không cần cho thao tác hằng ngày.

Không xóa image đang dùng để chạy ứng dụng. Docker có thể tải hoặc build lại,
nhưng việc đó không khôi phục dữ liệu nằm sai chỗ ngoài volume.

### Container

```powershell
docker ps
docker ps -a
docker inspect <container-id-hoac-ten>
docker logs --tail 100 <container-id-hoac-ten>
docker logs -f <container-id-hoac-ten>
docker exec -it <container-id-hoac-ten> sh
docker stop <container-id-hoac-ten>
docker start <container-id-hoac-ten>
docker restart <container-id-hoac-ten>
```

- `docker ps`: container đang chạy.
- `docker ps -a`: gồm cả container đã dừng.
- `docker inspect`: cấu hình chi tiết, mount, network, trạng thái health.
- `docker logs`: đọc stdout/stderr của một container.
- `docker exec`: chạy lệnh trong container đang chạy; `sh` mở shell nếu image có
  shell tương thích.
- `stop`, `start`, `restart`: dừng, chạy lại hoặc khởi động lại container cụ thể.

Để làm việc với dự án này nên ưu tiên lệnh Compose theo tên service, ví dụ
`docker compose exec app sh`, thay vì phải tra tên container.

### Chạy container tạm

```powershell
docker run --rm hello-world
```

`docker run` tạo và chạy container từ image. `--rm` xóa container tạm khi lệnh
kết thúc. Không dùng `docker run mysql:8.4` để thay cho stack này nếu chưa tự
cấu hình volume, biến môi trường, network và schema.

### Network

```powershell
docker network ls
docker network inspect <network-name>
```

Compose tạo network riêng cho project. Trong đó PHP truy cập MySQL qua `db:3306`;
không đổi `DB_HOST` thành `localhost` bên trong container PHP, vì `localhost`
sẽ trỏ về chính container PHP.

### Volume

```powershell
docker volume ls
docker volume inspect <volume-name>
```

Volume được quản lý riêng và tồn tại sau khi container bị tạo lại. Trong stack,
volume giữ dữ liệu MySQL và file ảnh upload.

> **Cẩn thận:** `docker volume rm`, `docker volume prune` hoặc `docker compose
> down -v` có thể xóa database/uploads. Không chạy nếu chưa xác định rõ volume
> và đã backup dữ liệu cần giữ.

## 7. Các lệnh Docker Compose của dự án

Các lệnh sau chạy tại thư mục có `compose.yaml`.

### Kiểm tra cấu hình và service

```powershell
docker compose config --quiet
docker compose config --services
docker compose ps
docker compose ps -a
```

- `config --quiet`: kiểm tra YAML và nội suy biến mà không in cấu hình ra màn
  hình; hữu ích để tránh vô tình hiển thị credential.
- `config --services`: liệt kê service (`app`, `db`).
- `ps`: trạng thái container của project; thêm `-a` để thấy cả container dừng.

### Khởi động

```powershell
docker compose up -d
docker compose up --build -d
docker compose up -d app
```

- `up -d`: tạo/chạy service ở nền.
- `up --build -d`: build lại image của `app` trước khi chạy, cần dùng sau thay
  đổi Dockerfile hoặc mã nguồn đã được `COPY` vào image.
- `up -d app`: yêu cầu khởi động service `app`; Compose cũng khởi động service
  phụ thuộc `db` nếu cần.

Trong cấu hình hiện tại, mã nguồn được `COPY` vào image, không bind mount từ
thư mục code trên host. Vì vậy sửa PHP/HTML/JS cần build lại để cập nhật container:

```powershell
docker compose up --build -d app
```

### Log và chạy lệnh trong service

```powershell
docker compose logs --tail 100 app
docker compose logs -f app
docker compose logs -f db
docker compose exec app php -v
docker compose exec app php -m
docker compose exec app sh
docker compose exec db mysql -u root -p
```

- `logs app` / `logs db`: log riêng của service.
- `exec app ...`: chạy lệnh trong container `app` đang chạy.
- `php -m`: kiểm tra các PHP extension đã bật, gồm `pdo_mysql` và `mbstring`.
- `exec db mysql ...`: mở MySQL client bên trong container; lệnh sẽ yêu cầu mật
  khẩu root của MySQL.

Không đặt mật khẩu database trực tiếp vào lệnh, vì lệnh có thể xuất hiện trong
history hoặc danh sách process.

### Dừng, khởi động lại, cập nhật

```powershell
docker compose stop
docker compose start
docker compose restart app
docker compose pull
docker compose build app
```

- `stop`: dừng container nhưng giữ container, network và volume.
- `start`: chạy lại container đã dừng.
- `restart app`: khởi động lại service PHP.
- `pull`: tải image mới từ registry cho service có khai báo image; hữu ích nếu
  cập nhật MySQL tag.
- `build app`: build image ứng dụng mà chưa cần khởi động.

### Hạ stack

```powershell
docker compose down
```

Lệnh này dừng và xóa container/network của Compose project nhưng **giữ named
volume** `mysql_data` và `uploads`. Dùng khi muốn tắt stack mà vẫn giữ dữ liệu.

> **Lệnh phá hủy dữ liệu — không chạy để sửa lỗi thông thường:**
>
> ```powershell
> docker compose down -v
> ```
>
> `-v` xóa cả named volume của project, bao gồm database và ảnh upload. Khi chạy
> lại, MySQL coi như datadir mới và nhập schema/seed lại; dữ liệu trước đó không
> còn trong volume đã xóa. Chỉ cân nhắc sau khi đã backup và xác nhận đúng project.

## 8. Backup và phục hồi database container

Backup database vào file trong container MySQL rồi sao chép file nhị phân ra host
(PowerShell). Cách này tránh làm hỏng encoding SQL khi redirect output của chương
trình native trong Windows PowerShell:

```powershell
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -u root "$MYSQL_DATABASE" > /tmp/fashion_pos_db-backup.sql'
docker compose cp db:/tmp/fashion_pos_db-backup.sql .\fashion_pos_db-backup.sql
```

File backup có dữ liệu nghiệp vụ nhạy cảm; lưu ở nơi được bảo vệ, không commit
file đó vào Git.

Phục hồi vào database của stack hiện tại:

```powershell
docker compose cp .\fashion_pos_db-backup.sql db:/tmp/fashion_pos_db-backup.sql
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -u root "$MYSQL_DATABASE" < /tmp/fashion_pos_db-backup.sql'
```

Chỉ phục hồi sau khi xác nhận đang thao tác đúng project/database. Restore có
thể thêm hoặc ghi đè dữ liệu tùy nội dung dump; không dùng như một lệnh kiểm tra.

## 9. Troubleshooting

### `docker` không kết nối được daemon

1. Mở Docker Desktop và chờ Engine báo Running.
2. Kiểm tra `docker info`.
3. Nếu có nhiều Docker context, xem bằng `docker context ls`; chọn đúng context
   đang chạy bằng `docker context use <context-name>`.

### Cổng 8000 đã được sử dụng

Kiểm tra process/container đang giữ cổng:

```powershell
docker compose ps
docker ps
```

Compose hiện bind `127.0.0.1:8000:8000`. Dừng ứng dụng local khác đang giữ cổng
hoặc đổi cổng host trong `compose.yaml` (phần bên trái dấu `:`), ví dụ
`127.0.0.1:8080:8000`; sau đó truy cập `http://127.0.0.1:8080/`.

### PHP không kết nối MySQL

1. `docker compose ps` để xác nhận `db` healthy và `app` đang chạy.
2. `docker compose logs --tail 100 db` và `docker compose logs --tail 100 app`.
3. Trong Compose, `DB_HOST` phải là `db`, `DB_PORT` là `3306`.
4. Nếu vừa sửa password trong `.env` sau lần khởi tạo đầu, lưu ý MySQL giữ user
   và password cũ trong volume hiện tại; đổi `.env` không tự sửa credential đã
   lưu trong database.

### Sửa code nhưng giao diện/API chưa đổi

Vì source được đóng vào image bằng `COPY`, hãy build lại:

```powershell
docker compose up --build -d app
```

### Sửa `schema.sql` hoặc `seed.sql` nhưng database không đổi

Script trong `/docker-entrypoint-initdb.d/` chỉ chạy khi MySQL khởi tạo datadir
mới. Không xóa volume để ép init script chạy lại; việc đó sẽ xóa database.

#### Thêm seed cho database mới

Thêm các `INSERT` cần thiết vào `backend/database/seed.sql`. Khi chạy lần đầu,
Compose đã mount file này sau `schema.sql`; MySQL tự chạy seed khi tạo volume
`mysql_data` rỗng:

```powershell
docker compose up --build -d
docker compose logs db
```

Seed tạo admin demo `admin/admin`, 4 danh mục và 8 sản phẩm thời trang mẫu để
có thể thử POS ngay sau khi clone. Seed không tạo nhân viên, khách hàng, đơn
hàng hay QR giả. Dữ liệu cửa hàng thật có thể thay đổi trong ứng dụng sau khi
đăng nhập.

#### Thêm seed riêng khi khởi tạo volume mới

Tạo `backend/database/custom-seed.sql`, rồi thêm mount sau `seed.sql` trong
service `db` của `compose.yaml`:

```yaml
- ./backend/database/custom-seed.sql:/docker-entrypoint-initdb.d/03-custom-seed.sql:ro
```

Khi đó script được chạy sau schema và seed mặc định, nhưng chỉ khi `mysql_data` mới
được tạo.

#### Áp dụng seed vào database Docker đang chạy

`seed.sql` có thể chạy lại an toàn để bổ sung admin demo, danh mục hoặc sản phẩm
mẫu còn thiếu. Danh mục được bỏ qua nếu tên đã tồn tại; sản phẩm được bỏ qua
nếu barcode đã có. Từ PowerShell tại thư mục dự án, chạy:

```powershell
Get-Content .\backend\database\seed.sql -Raw | docker compose exec -T db sh -c 'mysql --default-character-set=utf8mb4 -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
```

Lệnh này không xóa hoặc ghi đè đơn hàng/dữ liệu khác; không cần xóa volume để
thêm dữ liệu demo.

### Upload ảnh bị lỗi

Kiểm tra `app` đang mount volume `uploads` và xem log:

```powershell
docker compose ps
docker compose exec app sh -c 'ls -ld /app/backend/public/uploads'
docker compose logs --tail 100 app
```

### Cấu hình và thử gửi email mời thật

Compose lấy SMTP từ `.env` tại thư mục gốc, cùng cấp `compose.yaml`. File
`backend/.env` không thay thế các biến SMTP được Compose truyền vào container.
Với Gmail, bật xác minh 2 bước và tạo App Password riêng; không dùng mật khẩu
đăng nhập Google. Điền cấu hình sau vào root `.env` (dùng đúng địa chỉ hộp thư
đã cấp App Password cho cả `SMTP_USERNAME` và `MAIL_FROM`):

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_ENCRYPTION=tls
SMTP_USERNAME=you@gmail.com
SMTP_PASSWORD=your-16-character-app-password
MAIL_FROM=you@gmail.com
```

Sau khi lưu `.env`, kiểm tra Compose và tạo lại riêng app để nạp biến mới:

```powershell
docker compose config --quiet
docker compose up -d --force-recreate app
docker compose ps
docker compose logs --tail 100 app
```

Sau khi cấu hình SMTP, đăng nhập QTV và tạo nhân viên bằng địa chỉ Gmail của
người nhận thật để gửi email mời. Ứng dụng chỉ nhận email nhân viên `@gmail.com`.
Người nhận mở email mời và dùng link trong vòng một phút để
đăng nhập bằng tên người dùng và mật khẩu tạm là MSSV trưởng nhóm, rồi đổi mật
khẩu lần đầu. Mật khẩu tạm đọc từ `STAFF_TEMP_PASSWORD` trong root `.env`; mẫu
Docker hiện dùng `52400269`. Nếu gửi lời mời gặp lỗi, tài khoản vẫn được lưu và có thể dùng
nút **Gửi lại link 1 phút** sau khi sửa cấu hình. `APP_URL=http://127.0.0.1:8000`
chỉ dùng khi người nhận mở link trên chính máy đó; gửi cho người dùng thiết bị
khác thì cần URL HTTPS công khai mà họ truy cập được.

Không chép App Password hoặc SMTP secret vào tài liệu, chat hay Git. Không cần
xóa volume hoặc khởi tạo lại database khi thay SMTP.

## 10. Các lệnh dọn dẹp và rủi ro

| Lệnh | Tác động | Khuyến nghị |
|---|---|---|
| `docker compose down` | Xóa container/network project; giữ named volume. | Dùng để tắt stack và giữ data. |
| `docker compose down -v` | Xóa container/network và volume Compose, có thể mất database/uploads. | Không chạy nếu chưa backup và xác nhận. |
| `docker volume rm <name>` | Xóa volume được chỉ định; dữ liệu trong volume mất. | Chỉ chạy khi đã xác định volume và chấp nhận mất dữ liệu. |
| `docker volume prune` | Xóa volume không được container sử dụng. | Tránh chạy trên máy có dữ liệu cần giữ. |
| `docker system prune` | Dọn resource không dùng; có thể ảnh hưởng cache/container dừng. | Đọc prompt và hiểu phạm vi trước khi xác nhận. |
| `docker system prune -a --volumes` | Dọn rộng cả image/cache và volume không dùng. | Tránh dùng cho thao tác sửa lỗi thông thường. |

Ưu tiên `docker compose logs`, `docker compose ps`, `docker compose config
--quiet` và `docker compose restart app` để chẩn đoán trước; không dùng lệnh xóa
dữ liệu như một cách thử-sai.

## 11. Giới hạn sử dụng hiện tại

- Image chạy PHP built-in server, phù hợp học tập, demo và phát triển local; chưa
  phải cấu hình production-grade.
- Không có bind mount source code; cần build lại image sau khi thay mã nguồn.
- MySQL không publish cổng ra host theo mặc định; truy cập bằng `docker compose
  exec db ...` hoặc cấu hình port riêng nếu thật sự cần.
- Compose tự khởi tạo schema/seed chỉ khi volume database mới; `seed.sql` không
  phải lệnh reset dữ liệu.
- Trước khi đưa lên production cần HTTPS/reverse proxy, secrets management,
  backup tự động, giám sát, chính sách quyền MySQL tối thiểu và hardening web
  server/container.

## 12. Bảng lệnh tham khảo nhanh

| Mục đích | Lệnh |
|---|---|
| Kiểm tra Docker Engine | `docker info` |
| Kiểm tra Compose YAML | `docker compose config --quiet` |
| Liệt kê service | `docker compose config --services` |
| Khởi động lần đầu/build | `docker compose up --build -d` |
| Xem trạng thái | `docker compose ps` |
| Theo dõi log app | `docker compose logs -f app` |
| Theo dõi log MySQL | `docker compose logs -f db` |
| Chạy lại sau khi sửa code | `docker compose up --build -d app` |
| Mở shell trong app | `docker compose exec app sh` |
| Dừng và giữ database | `docker compose down` |
| **Xóa volume/database** | **`docker compose down -v` — có thể mất dữ liệu** |
