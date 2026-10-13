# Frontend API Contract

Tài liệu này mô tả các API mà frontend hiện gọi và những điều backend/database
cần đáp ứng. Frontend dùng cùng origin, cookie phiên đăng nhập và tiền tố mặc
định `/api/`; có thể cấu hình `window.POS_API_BASE_URL` trước `api.js` nếu cần
đổi tiền tố.

## Quy ước chung

- Request/response dùng UTF-8 JSON; request tải ảnh dùng `multipart/form-data`.
- API nên trả cấu trúc nhất quán: `{ "data": { ... } }`; danh sách dùng
  `{ "data": { "items": [] } }`. Frontend chấp nhận thêm các dạng `items`,
  `orders`, `products`, `customers`, `users` ở cấp gốc hoặc trong `data`.
- Lỗi nên có mã HTTP phù hợp và JSON `{ "message": "...", "errors": {} }`.
  Frontend đọc `message`, `error` và lỗi kiểm tra dữ liệu trong `errors`.
- Dùng `401` cho phiên hết hạn, `403` cho thiếu quyền, `404` cho bản ghi không
  tồn tại, `409` cho xung đột (barcode/phone trùng hoặc sản phẩm đã bán), và
  `422` cho dữ liệu đầu vào không hợp lệ.
- API phải kiểm tra phiên, quyền và dữ liệu ở server. Ẩn nút ở frontend chỉ là
  hỗ trợ giao diện, không phải biện pháp bảo mật.
- Request gửi cùng-origin cookie; nếu dùng session cookie, server cần chống CSRF.
  Khi HTML có `<meta name="csrf-token">`, `api.js` tự gửi `X-CSRF-TOKEN`.

## Đăng nhập, hồ sơ và nhân viên

| Phương thức và đường dẫn | Dữ liệu/response chính |
|---|---|
| `POST auth/login` | Body `{ username, password }`; trả `user` có `id`, `username`, `role`, tên và `is_first_login`. Khi tài khoản cần kích hoạt, trả token dùng trong link email hoặc từ chối đăng nhập trực tiếp bằng lỗi `INVITE_LINK_REQUIRED` / `INVITATION_EXPIRED`. |
| `GET auth/me` | Trả hồ sơ người đang đăng nhập. |
| `POST auth/logout` | Hủy phiên server. |
| `GET auth/invitations/validate?token=...` | Kiểm tra link kích hoạt; link phải hết hạn sau 60 giây. |
| `POST auth/first-login` | Body `{ token, password, password_confirmation }`; cập nhật mật khẩu và hoàn tất kích hoạt. Frontend yêu cầu đăng nhập lại sau đó. |
| `POST auth/change-password` | Body `{ current_password, password, password_confirmation }`. |
| `PUT auth/profile` | JSON `{ name, phone }`. |
| `POST auth/profile` | Multipart `name`, `phone`, `avatar` khi đổi ảnh đại diện. |
| `GET users` | Danh sách có `id`, `username`, `email`, `role`, `first_name`, `last_name`, `phone`, `avatar`, `status`, `is_first_login`, `created_at`. |
| `POST users` | Body `{ first_name, last_name, phone, email }`; admin tạo nhân viên, backend suy ra username từ phần trước `@` và gửi link email 60 giây. |
| `PUT users/{id}/status` | Body `{ status: "active" | "inactive" | "locked" }`; không dùng thao tác này để bỏ qua bước kích hoạt lần đầu. |
| `POST users/{id}/resend-invitation` | Gửi link kích hoạt mới, token cũ mất hiệu lực. |
| `GET reports/sales?user_id={id}&from={date}&to={date}` | Doanh số nhân viên cho cửa sổ chi tiết trong trang Nhân viên. |

Email nhân viên theo yêu cầu dự án phải là Gmail. Mật khẩu khởi tạo và quy tắc
kích hoạt do backend thực hiện; mật khẩu khởi tạo là mã số sinh viên của trưởng
nhóm viết thường theo đề bài, frontend không lưu mật khẩu nhân viên. Cần seed
tài khoản admin mặc định `admin/admin` ở môi trường bài tập và cho phép admin
đổi mật khẩu ngay sau khi đăng nhập.

## Sản phẩm và danh mục

| Phương thức và đường dẫn | Dữ liệu/response chính |
|---|---|
| `GET products` | Danh sách có `id`, `name`, `barcode`, `sku`, `category_id`, `category_name`, `price`, `stock_quantity`, `status`, `created_at`; chỉ trả `import_price` cho admin. |
| `GET products?status=active` | Sản phẩm đang bán dùng trong POS. |
| `POST products`, `PUT products/{id}` | `name`, `barcode`, `category_id`, `import_price`, `price`, tồn kho và thuộc tính sản phẩm. Frontend yêu cầu barcode và danh mục. |
| `DELETE products/{id}` | Server từ chối xóa nếu sản phẩm đã được dùng trong bất kỳ đơn nào. |
| `GET categories` | Danh sách có `id`, `name`, `description`, `created_at`, `created_by` hoặc thông tin người tạo. |
| `POST categories`, `PUT categories/{id}`, `DELETE categories/{id}` | Chỉ admin; server kiểm tra quan hệ sản phẩm trước khi xóa danh mục. |

## Khách hàng và POS

| Phương thức và đường dẫn | Dữ liệu/response chính |
|---|---|
| `GET customers` | Danh sách chỉ đọc; không có API tạo/sửa/xóa khách hàng từ màn hình quản lý. |
| `GET customers/lookup?phone={phone}` | Trả `{ customer: null }` nếu chưa có, hoặc đối tượng khách hàng có `id`, `phone`, `full_name`, `address`. `404` cũng được frontend hiểu là khách mới. |
| `GET customers/{id}/orders` | Lịch sử đơn của khách; mỗi đơn trả mã, thời điểm, số lượng mặt hàng, tổng tiền, tiền khách đưa, tiền thừa và `id`. |
| `GET orders/{id}` | Chi tiết đơn và các mặt hàng (`product_name`, `quantity`, `unit_price`, `total_price`). |
| `POST orders` | Payload gồm `customer_id` (ID có sẵn hoặc `null`), `customer` (`phone`, `full_name`, `address`), `discount_percent`, `totals`, `payment_method`, `amount_received`, `change_amount`, `status` và `items[{product_id, quantity}]`. Trả `order` có `id`, `order_number`, `created_at`. |
| `GET payment_qrcodes?is_active=1` | Danh sách QR đang dùng tại quầy, có `qr_code_path`, `payment_method`, `description`, `is_active`. |
| `GET store_settings` | Thông tin cửa hàng, `tax_rate`, tiền tố hóa đơn và nội dung in bill. |

Khi thanh toán đơn hoàn tất với khách mới, backend phải tạo hoặc tìm khách hàng
theo số điện thoại và ghi `customer_id` trong cùng transaction với đơn hàng.
Không tin `subtotal`, thuế, chiết khấu, tồn kho hoặc tổng tiền do client gửi;
server tính lại từ giá sản phẩm và quy tắc làm tròn VND. Chỉ trừ kho một lần khi
đơn được hoàn tất; thao tác tạo đơn và các dòng đơn phải nguyên tử.

QR và thẻ hiện yêu cầu nhân viên xác nhận đã nhận tiền. Đây là xác nhận tại quầy,
không thay thế xác thực giao dịch từ cổng thanh toán.

## Hóa đơn, báo cáo và cài đặt

| Phương thức và đường dẫn | Dữ liệu/response chính |
|---|---|
| `GET orders?from=&to=&search=&payment_method=` | Danh sách hóa đơn có thông tin khách, nhân viên, trạng thái và các trường thanh toán. |
| `GET reports/sales?from={date}&to={date}` | Trả `summary.total_received`, `summary.order_count`, `summary.items_sold`, `summary.total_profit` (admin), `trend[]` theo ngày và `orders[]` theo thời gian. `total_received` là tiền bán ròng, không cộng phần khách đưa vượt rồi được trả lại. |
| `PUT store_settings` | Cập nhật một phần các cài đặt cửa hàng/hóa đơn; server nên merge trường gửi lên để lưu từng tab không ghi đè các tab khác. |
| `GET payment_qrcodes` | Danh sách mã QR. |
| `POST payment_qrcodes` | Multipart `qr_code`, `payment_method`, `description`; trả bản ghi mới cùng đường dẫn ảnh. |
| `PUT payment_qrcodes/{id}` | Body `{ is_active: 0 | 1 }`. |

Ngày lọc là `YYYY-MM-DD`, tính theo múi giờ cửa hàng `Asia/Ho_Chi_Minh`; ngày
kết thúc phải bao gồm toàn bộ ngày đó. Báo cáo chỉ cộng đơn hoàn tất; admin mới
nhận lợi nhuận. Frontend không tự suy lợi nhuận nếu API không gửi số liệu này.

## Database hiện có và việc cần đối chiếu

`database/database.sql` đã có bảng `users`, `categories`, `products`,
`customers`, `orders`, `order_items`, `payment_qrcodes`, `store_settings`.
Schema lưu `users.status` dưới dạng `active/inactive/locked` (không có `pending`),
`products.category_id` và `products.barcode` hiện cho phép `NULL`, còn UI nay yêu
cầu barcode và danh mục. Frontend nhận diện tài khoản chờ kích hoạt qua
`is_first_login`; backend không nên dựa vào trạng thái `pending` nếu giữ nguyên
schema. `order_items` đã lưu giá nhập và giá bán tại thời điểm mua, nhưng chưa
lưu tên/size/màu sản phẩm dạng snapshot; backend cần trả dữ liệu nhất quán cho
lịch sử hoặc thêm snapshot nếu thông tin sản phẩm có thể thay đổi sau giao dịch.
Các token kích hoạt nên dùng một lần, hết hạn theo `token_time` và không cho
đăng nhập trực tiếp khi `is_first_login` còn bật. Hãy xác nhận các
constraint/index và migration trước khi viết API.

## Windows, macOS và Linux

- Chạy qua HTTP(S), không mở trang bằng `file://`; các API, fragment và component
  giao diện cần cùng origin.
- Dùng đường dẫn URL `/` trong HTML/API, không dùng đường dẫn file kiểu
  `C:\\...`; hệ thống Linux phân biệt chữ hoa/chữ thường trong tên thư mục.
- Tên thư mục `pages/Customers` hiện viết hoa chữ `C`; mọi link cần giữ đúng chữ
  hoa này khi chạy trên Linux.
- Frontend không yêu cầu Node.js hoặc bước build. README có lệnh chạy PHP tích
  hợp cho Windows/macOS/Linux; backend và MySQL cần được cài đặt/cấu hình riêng.
