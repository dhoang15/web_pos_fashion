# Frontend API contract

Tài liệu này mô tả các API mà frontend gọi để backend PHP và MySQL có thể triển khai tương thích. Đây là hợp đồng tích hợp, không phải phần cài đặt backend.

## Quy ước chung

- Frontend gọi cùng origin với tiền tố mặc định `/api/`; có thể đặt `window.POS_API_BASE_URL` trước `api.js` để đổi tiền tố.
- Request và response JSON dùng UTF-8. Upload ảnh dùng `multipart/form-data`.
- Thành công nên trả `{ "data": { ... } }`. Danh sách nên trả `{ "data": { "items": [] } }`. Frontend chấp nhận một số alias như `users`, `products`, `orders` và `data`.
- Lỗi nên trả JSON `{ "message": "...", "code": "...", "errors": {} }`. Dùng mã HTTP phù hợp: `401`, `403`, `404`, `409`, `422`.
- Phiên đăng nhập dùng cookie same-origin. Nếu dùng session cookie, backend phải cấp và kiểm tra CSRF token; `api.js` tự gửi `X-CSRF-TOKEN` khi HTML có `<meta name="csrf-token">`. Nếu trang HTML tĩnh không thể inject meta, cần cơ chế CSRF tương đương.
- Mọi phân quyền, kiểm tra dữ liệu, tồn kho và tính tiền phải được thực hiện ở server. Ẩn điều khiển bằng JavaScript chỉ là hành vi giao diện.

## Đăng nhập, kích hoạt và hồ sơ

| Phương thức và đường dẫn | Hợp đồng |
|---|---|
| `POST auth/invitations/validate` | Body `{ "token": "..." }`; trả `{ "data": { "valid": true } }` hoặc lỗi link hết hạn/không hợp lệ. Token không dùng trong query string để tránh xuất hiện trong access log. |
| `POST auth/login` | Body `{ "username": "...", "password": "...", "invitation_token": "..." }`; `invitation_token` chỉ có với nhân viên đăng nhập lần đầu từ email. Backend phải xác minh token thuộc đúng tài khoản đang đăng nhập và tiêu thụ token nguyên tử khi tạo session. Thành công tạo session cookie và trả `data.user` gồm `id`, `username`, `role`, tên, `is_first_login`. |
| `GET auth/me` | Trả hồ sơ người đang đăng nhập, gồm role và `is_first_login`; cần cho bước kiểm tra session trước khi đổi mật khẩu lần đầu. |
| `POST auth/first-login` | Yêu cầu session đã đăng nhập lần đầu; body `{ "password": "...", "password_confirmation": "..." }`. Cập nhật mật khẩu, đặt `is_first_login=0`, xóa token mời và giữ session hợp lệ để chuyển vào ứng dụng. Không cần mật khẩu cũ hoặc token mời ở bước này. |
| `POST auth/logout` | Hủy session phía server. |
| `POST auth/change-password` | Body `{ "current_password": "...", "password": "...", "password_confirmation": "..." }`. |
| `PUT auth/profile` | JSON `{ "name": "...", "phone": "..." }`. |
| `POST auth/profile` | Multipart `name`, `phone`, `avatar` khi cập nhật ảnh đại diện. |

### Quy tắc tài khoản theo đề

- Tài khoản mặc định là `admin/admin`; SQL tạo tài khoản này với `is_first_login=0` để không đưa admin vào luồng kích hoạt nhân viên.
- Admin tạo nhân viên qua `POST users`. Username là phần trước `@` của Gmail. Mật khẩu tạm thời là mã số sinh viên của trưởng nhóm viết thường; backend cần lấy giá trị này từ cấu hình triển khai, băm trước khi lưu và gửi thông tin đăng nhập cùng liên kết mời trong email.
- Link email mở `pages/auth/login.html#invite=<token>`, có hiệu lực đúng 60 giây. Frontend gửi token qua body đến endpoint kiểm tra và endpoint đăng nhập. Khi đăng nhập thành công lần đầu, backend tiêu thụ token để không thể dùng lại.
- Nếu nhân viên chưa kích hoạt đăng nhập không có token hợp lệ, API phải từ chối bằng `INVITE_LINK_REQUIRED` hoặc `INVITATION_EXPIRED` và không tạo session.
- Trong session có `is_first_login=1`, server chỉ cho phép `GET auth/me`, `POST auth/first-login` và `POST auth/logout`. Frontend cũng chuyển về trang đổi mật khẩu, nhưng cờ trong trình duyệt không thay thế kiểm tra server.
- Token nên sinh bằng nguồn ngẫu nhiên an toàn, chỉ lưu hash trong `users.login_token`, lưu thời điểm phát hành ở `users.token_time`, hết hạn sau 60 giây và bị vô hiệu hóa sau khi dùng hoặc gửi lại link.

## Nhân viên và báo cáo theo nhân viên

| Phương thức và đường dẫn | Hợp đồng |
|---|---|
| `GET users` | Danh sách có `id`, `username`, `email`, `role`, `first_name`, `last_name`, `phone`, `avatar`, `status`, `is_first_login`, `created_at`. `status` nhận `active`, `inactive`, `locked`. |
| `POST users` | Body `{ "first_name": "...", "last_name": "...", "phone": "...", "email": "..." }`; chỉ admin. Chỉ chấp nhận địa chỉ `@gmail.com`; từ chối Gmail/username trùng và gửi email mời. |
| `PUT users/{id}/status` | Body `{ "status": "active" | "inactive" | "locked" }`; không được bỏ qua kích hoạt lần đầu bằng cách đổi status. |
| `POST users/{id}/resend-invitation` | Phát token mới và làm token cũ mất hiệu lực. |
| `GET reports/sales?user_id={id}&from={date}&to={date}` | Admin có thể xem doanh số nhân viên theo `user_id`. Với mọi role không phải admin (`staff`, `cashier`), backend bắt buộc bỏ qua `user_id` do client gửi và giới hạn theo tài khoản của session hiện tại. Frontend cũng gửi `user_id` hiện tại để bộ lọc hiển thị rõ phạm vi, nhưng đây không phải cơ chế phân quyền. |

## Sản phẩm và danh mục

| Phương thức và đường dẫn | Hợp đồng |
|---|---|
| `GET products` | Danh sách gồm `id`, `name`, `barcode`, `sku`, `category_id`, `category_name`, `price`, `stock_quantity`, `low_stock_threshold`, `size`, `color`, `material`, `image`, `status`, `created_at`, `has_orders` (boolean). Chỉ admin nhận `import_price`. |
| `GET products?status=active` | Sản phẩm đang bán để hiển thị trong POS. |
| `POST products`, `PUT products/{id}` | Tạo/cập nhật tên, barcode, danh mục, giá nhập, giá bán, tồn kho và thuộc tính. Barcode và danh mục là bắt buộc. |
| `POST products`, `POST products/{id}` | Khi upload ảnh, multipart field `image_file`; khi cập nhật multipart, gửi thêm `_method=PUT`. JSON `PUT` dùng khi không upload ảnh. Response có URL `image`. |
| `DELETE products/{id}` | Server từ chối xóa nếu sản phẩm đã xuất hiện trong đơn hàng. |
| `GET categories` | Danh sách `id`, `name`, `description`, `created_at` và tên người tạo qua `created_by_name` hoặc `created_by_user: { id, first_name, last_name, name }`. `created_by` là ID quan hệ tùy chọn, không thay thế tên hiển thị. |
| `POST categories`, `PUT categories/{id}`, `DELETE categories/{id}` | Chỉ admin; server kiểm tra sản phẩm đang tham chiếu trước khi xóa. |

Nhân viên được xem sản phẩm nhưng không được nhận `import_price` từ API và không được tạo/sửa/xóa sản phẩm hoặc danh mục. Frontend ẩn các điều khiển quản trị để giao diện phản ánh quyền này.

## Khách hàng, POS và hóa đơn

| Phương thức và đường dẫn | Hợp đồng |
|---|---|
| `GET customers` | Danh sách khách chỉ đọc gồm `id`, `phone`, `full_name`, `address`, `created_at`, `order_count`, `total_spent`; giao diện không tạo khách thủ công. |
| `GET customers/lookup?phone={phone}` | Khách cũ trả đối tượng `customer` có `id`, `phone`, `full_name`, `address`; khách mới trả `customer: null` hoặc `404`. |
| `GET customers/{id}/orders` | Lịch sử có `id`, `order_number`, `created_at`, `status`, `items_sold`, `total_amount`, `amount_received`, `change_amount`. |
| `GET orders/{id}` | Chi tiết chuẩn gồm khách, thu ngân, trạng thái, các khoản tiền, phương thức thanh toán và `items[]` với `product_id`, `product_name`, `size`, `color`, `quantity`, `unit_price`, `total_price`. Với khách chưa có `customer_id`, trả snapshot dưới `customer_snapshot_*` hoặc ánh xạ thành `customer`; frontend dùng response này cho hóa đơn và mở lại đơn nháp. |
| `POST orders` | Tạo đơn mới. Payload gồm `customer_id`, `customer` (`phone`, `full_name`, `address`), `discount_percent`, `totals`, `payment_method`, `amount_received`, `change_amount`, `status`, `items[{product_id, quantity}]`. |
| `PUT orders/{id}` | Cập nhật đơn `pending` được mở lại từ hóa đơn. Chỉ cho phép `pending` → `pending` hoặc `completed`; chỉ trừ kho khi hoàn tất. |
| `GET orders?from=&to=&search=&payment_method=` | Danh sách hóa đơn theo bộ lọc, gồm thông tin khách (kể cả snapshot), thu ngân, status và trường thanh toán. Phải trả đơn `pending` để giao diện tiếp tục đơn nháp. |
| `GET payment_qrcodes?is_active=1` | QR đang hoạt động gồm `qr_code_path`, `payment_method`, `description`, `is_active`. |
| `GET store_settings` | Thông tin cửa hàng, `tax_rate`, tiền tố hóa đơn và nội dung in bill. |

Khi hoàn tất thanh toán, frontend yêu cầu số điện thoại và tra cứu trước. Khách cũ được điền thông tin từ kết quả tra cứu; khách mới phải nhập họ tên và địa chỉ. Không thể hoàn tất đơn dưới dạng khách ẩn danh. Đơn nháp có thể lưu trước khi chọn khách, nhưng phải có thông tin khách hợp lệ trước khi hoàn tất. Khi thanh toán thành công với khách mới, backend tạo/tìm khách bằng số điện thoại và gắn vào đơn trong cùng transaction. Đơn nháp lưu snapshot tên, điện thoại, địa chỉ khách mới để mở lại không mất dữ liệu; chỉ tạo hồ sơ khách chính thức khi hoàn tất. `order_items` cần snapshot tên/size/màu sản phẩm để hóa đơn cũ không đổi khi sản phẩm được sửa.

Server phải tính lại giá, tồn kho, chiết khấu, thuế, tổng tiền và tiền thừa; không tin tổng do client gửi. Lưu đơn, dòng hàng, khách mới và trừ kho phải nguyên tử. Đơn nháp phải gửi rõ `status=pending`; schema mặc định đơn mới là `completed` nên backend không được dựa vào default. Danh sách hóa đơn và lịch sử đơn cũng phải lọc theo quyền: admin được xem toàn cửa hàng, nhân viên chỉ được xem các đơn thuộc tài khoản của mình.

QR/thẻ hiện có bước thu ngân xác nhận đã nhận tiền; giao diện này không xác minh giao dịch từ ngân hàng/cổng thanh toán.

## Báo cáo, cài đặt và hồ sơ

| Phương thức và đường dẫn | Hợp đồng |
|---|---|
| `GET reports/sales?from={date}&to={date}` | Trả `summary.total_received`, `summary.order_count`, `summary.items_sold`, `summary.total_profit` (chỉ admin), `trend[]`, `orders[]`. `total_received` là doanh thu ròng, không cộng phần tiền thừa đã trả. |
| `PUT store_settings` | Cập nhật một phần cài đặt cửa hàng/hóa đơn; backend merge trường để lưu từng tab không ghi đè tab khác. |
| `GET payment_qrcodes` | Danh sách QR cho trang cài đặt. |
| `POST payment_qrcodes` | Multipart `qr_code`, `payment_method`, `description`. |
| `PUT payment_qrcodes/{id}` | Body `{ "is_active": 0 | 1 }`. |

Ngày gửi theo `YYYY-MM-DD`, dùng múi giờ `Asia/Ho_Chi_Minh`; ngày kết thúc bao gồm trọn ngày. Báo cáo chỉ tính đơn hoàn tất; lợi nhuận chỉ trả cho admin.

## Ánh xạ database hiện tại

`database/database.sql` tạo các bảng `users`, `categories`, `products`, `customers`, `orders`, `order_items`, `payment_qrcodes`, `store_settings` và một số bảng mở rộng. Schema dùng `users.status=active/inactive/locked`, `users.is_first_login`, `orders.status=pending/completed/cancelled`, `products.category_id` và `products.barcode` bắt buộc.

Các cột snapshot cần có:

- `orders.customer_snapshot_name`, `customer_snapshot_phone`, `customer_snapshot_address` để giữ thông tin khách mới trên đơn nháp.
- `order_items.product_name`, `size`, `color` để lưu thông tin sản phẩm tại thời điểm bán.

Database mới nhận các cột này từ `database/database.sql`. Database đã tạo trước đó chạy migration một lần tại `database/migrations/001_add_order_snapshots_and_default_admin.sql`.

## Chạy đa hệ điều hành

- Mở ứng dụng qua HTTP(S), không dùng `file://`.
- Đường dẫn frontend dùng URL tương đối và thư mục khách hàng là `pages/Customers` (chữ `C` hoa) để tương thích Linux.
- Frontend không cần bước build. Repository hiện chưa có PHP API backend; cần triển khai các route trong hợp đồng này trước khi các luồng dữ liệu hoạt động.
