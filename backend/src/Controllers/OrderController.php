<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiException;
use App\Core\Request;

final class OrderController extends Controller
{
    public function index(Request $request): void
    {
        $query = $request->query();
        $where = [];
        $params = [];
        $this->applyDateFilters($query, $where, $params);
        if ((string)($_SESSION['role'] ?? '') !== 'admin') {
            $where[] = 'o.user_id = :current_user';
            $params['current_user'] = $this->currentUserId();
        }
        if (!empty($query['payment_method']) && in_array($query['payment_method'], ['cash', 'card', 'qr_code'], true)) {
            $where[] = 'o.payment_method = :payment_method';
            $params['payment_method'] = $query['payment_method'];
        }
        if (!empty($query['search'])) {
            $where[] = '(o.order_number LIKE :search OR o.customer_snapshot_name LIKE :search OR o.customer_snapshot_phone LIKE :search)';
            $params['search'] = '%' . trim((string)$query['search']) . '%';
        }
        $sql = $this->baseSelect() . ($where ? ' WHERE ' . implode(' AND ', $where) : '') . ' ORDER BY o.created_at DESC';
        $this->ok($this->rows($sql, $params));
    }

    public function show(Request $request): void
    {
        $order = $this->loadOrder((int)$request->param('id'));
        if (!$order) {
            throw new ApiException('Không tìm thấy đơn hàng.', 404, 'ORDER_NOT_FOUND');
        }
        $this->assertCanView($order);
        $this->ok(['order' => $this->withItems($order)]);
    }

    public function customerOrders(Request $request): void
    {
        $customerId = (int)$request->param('id');
        $customer = $this->row('SELECT id FROM customers WHERE id = :id', ['id' => $customerId]);
        if (!$customer) {
            throw new ApiException('Không tìm thấy khách hàng.', 404, 'CUSTOMER_NOT_FOUND');
        }
        $orders = $this->rows(
            $this->baseSelect() . ' WHERE o.customer_id = :customer_id ORDER BY o.created_at DESC',
            ['customer_id' => $customerId]
        );
        foreach ($orders as &$order) {
            $order = $this->withItems($order);
        }
        $this->ok(['orders' => $orders]);
    }

    public function create(Request $request): void
    {
        $this->save($request, null);
    }

    public function update(Request $request): void
    {
        $this->save($request, (int)$request->param('id'));
    }

    private function save(Request $request, ?int $orderId): void
    {
        $input = $request->input();
        $items = $input['items'] ?? null;
        if (!is_array($items) || !$items) {
            throw new ApiException('Đơn hàng cần có ít nhất một sản phẩm.', 422, 'VALIDATION_ERROR', ['items' => ['Danh sách sản phẩm không hợp lệ.']]);
        }
        $customerInput = is_array($input['customer'] ?? null) ? $input['customer'] : [];
        $method = (string)($input['payment_method'] ?? 'cash');
        $status = (string)($input['status'] ?? 'completed');
        if (!in_array($method, ['cash', 'card', 'qr_code'], true) || !in_array($status, ['pending', 'completed'], true)) {
            throw new ApiException('Phương thức thanh toán hoặc trạng thái không hợp lệ.', 422, 'VALIDATION_ERROR');
        }
        $discountPercent = filter_var($input['discount_percent'] ?? 0, FILTER_VALIDATE_FLOAT);
        if ($discountPercent === false || $discountPercent < 0 || $discountPercent > 100) {
            throw new ApiException('Mức giảm giá phải nằm trong khoảng 0–100%.', 422, 'VALIDATION_ERROR');
        }
        $receivedInput = $input['amount_received'] ?? 0;
        if (!is_numeric($receivedInput) || !is_finite((float)$receivedInput) || (float)$receivedInput < 0) {
            throw new ApiException('Số tiền khách thanh toán không hợp lệ.', 422, 'VALIDATION_ERROR', ['amount_received' => ['Số tiền phải không âm.']]);
        }

        $this->model->beginTransaction();
        try {
            $existing = null;
            if ($orderId !== null) {
                $existing = $this->row('SELECT * FROM orders WHERE id = :id FOR UPDATE', ['id' => $orderId]);
                if (!$existing) {
                    throw new ApiException('Không tìm thấy đơn hàng.', 404, 'ORDER_NOT_FOUND');
                }
                $this->assertCanView($existing);
                if ($existing['status'] !== 'pending') {
                    throw new ApiException('Chỉ có thể cập nhật đơn nháp.', 409, 'ORDER_NOT_PENDING');
                }
            }

            $normalizedItems = [];
            $subtotal = 0.0;
            $itemsByProduct = [];
            foreach ($items as $item) {
                $productId = filter_var($item['product_id'] ?? null, FILTER_VALIDATE_INT);
                $quantity = filter_var($item['quantity'] ?? null, FILTER_VALIDATE_INT);
                if (!$productId || !$quantity || $quantity < 1) {
                    throw new ApiException('Sản phẩm hoặc số lượng trong đơn không hợp lệ.', 422, 'VALIDATION_ERROR');
                }
                if (isset($itemsByProduct[$productId])) {
                    throw new ApiException('Một sản phẩm chỉ được thêm một lần vào đơn hàng.', 422, 'DUPLICATE_ORDER_ITEM');
                }
                $itemsByProduct[$productId] = $item;
            }
            ksort($itemsByProduct, SORT_NUMERIC);
            foreach ($itemsByProduct as $item) {
                $productId = (int)$item['product_id'];
                $quantity = (int)$item['quantity'];
                $product = $this->row('SELECT * FROM products WHERE id = :id FOR UPDATE', ['id' => $productId]);
                if (!$product || $product['status'] !== 'active') {
                    throw new ApiException('Một sản phẩm trong đơn không còn kinh doanh.', 409, 'PRODUCT_UNAVAILABLE');
                }
                if ($status === 'completed' && (int)$product['stock_quantity'] < $quantity) {
                    throw new ApiException('Sản phẩm "' . $product['name'] . '" không đủ tồn kho.', 409, 'INSUFFICIENT_STOCK');
                }
                $lineTotal = round((float)$product['price'] * $quantity, 2);
                $subtotal += $lineTotal;
                $normalizedItems[] = [
                    'product_id' => (int)$product['id'],
                    'product_name' => $product['name'],
                    'size' => $product['size'],
                    'color' => $product['color'],
                    'quantity' => $quantity,
                    'import_price' => (float)$product['import_price'],
                    'unit_price' => (float)$product['price'],
                    'total_price' => $lineTotal,
                ];
            }

            $customerId = $this->resolveCustomer($input['customer_id'] ?? null, $customerInput);
            $customer = $customerId ? $this->row('SELECT * FROM customers WHERE id = :id', ['id' => $customerId]) : null;
            $discount = round($subtotal * (float)$discountPercent / 100, 2);
            $settings = $this->rows("SELECT setting_key, setting_value FROM store_settings WHERE setting_key = 'tax_rate'");
            $taxRate = $settings ? (float)$settings[0]['setting_value'] : 10.0;
            $tax = round(max(0, $subtotal - $discount) * $taxRate / 100, 2);
            $total = round(max(0, $subtotal - $discount) + $tax, 2);
            $received = $method === 'cash' ? (float)$receivedInput : $total;
            if ($status === 'completed' && $received < $total) {
                throw new ApiException('Tiền khách đưa chưa đủ thanh toán.', 422, 'INSUFFICIENT_PAYMENT');
            }
            $change = $method === 'cash' ? max(0, $received - $total) : 0;
            $snapshot = [
                'customer_id' => $customerId,
                'customer_snapshot_name' => $customer['full_name'] ?? ($customerInput['full_name'] ?? null),
                'customer_snapshot_phone' => $customer['phone'] ?? ($customerInput['phone'] ?? null),
                'customer_snapshot_address' => $customer['address'] ?? ($customerInput['address'] ?? null),
            ];

            if ($existing) {
                $this->execute(
                    'UPDATE orders SET customer_id = :customer_id, customer_snapshot_name = :customer_snapshot_name, customer_snapshot_phone = :customer_snapshot_phone, customer_snapshot_address = :customer_snapshot_address, subtotal = :subtotal, discount_percent = :discount_percent, discount_amount = :discount_amount, tax_amount = :tax_amount, total_amount = :total_amount, payment_method = :payment_method, amount_received = :amount_received, change_amount = :change_amount, status = :status WHERE id = :id',
                    $snapshot + [
                        'subtotal' => $subtotal, 'discount_percent' => $discountPercent, 'discount_amount' => $discount,
                        'tax_amount' => $tax, 'total_amount' => $total, 'payment_method' => $method,
                        'amount_received' => $received, 'change_amount' => $change, 'status' => $status, 'id' => $orderId,
                    ]
                );
                $this->execute('DELETE FROM order_items WHERE order_id = :id', ['id' => $orderId]);
                $savedId = $orderId;
            } else {
                $prefix = $this->row("SELECT setting_value FROM store_settings WHERE setting_key = 'order_prefix'");
                $orderNumber = ($prefix['setting_value'] ?? 'ORD-') . date('YmdHis') . '-' . strtoupper(bin2hex(random_bytes(2)));
                $this->execute(
                    'INSERT INTO orders (order_number, user_id, customer_id, customer_snapshot_name, customer_snapshot_phone, customer_snapshot_address, subtotal, discount_percent, discount_amount, tax_amount, total_amount, payment_method, amount_received, change_amount, status) ' .
                    'VALUES (:order_number, :user_id, :customer_id, :customer_snapshot_name, :customer_snapshot_phone, :customer_snapshot_address, :subtotal, :discount_percent, :discount_amount, :tax_amount, :total_amount, :payment_method, :amount_received, :change_amount, :status)',
                    $snapshot + [
                        'order_number' => $orderNumber, 'user_id' => $this->currentUserId(), 'subtotal' => $subtotal,
                        'discount_percent' => $discountPercent, 'discount_amount' => $discount, 'tax_amount' => $tax,
                        'total_amount' => $total, 'payment_method' => $method, 'amount_received' => $received,
                        'change_amount' => $change, 'status' => $status,
                    ]
                );
                $savedId = (int)$this->model->lastInsertId();
            }

            foreach ($normalizedItems as $item) {
                $this->execute(
                    'INSERT INTO order_items (order_id, product_id, product_name, size, color, quantity, import_price, unit_price, total_price) VALUES (:order_id, :product_id, :product_name, :size, :color, :quantity, :import_price, :unit_price, :total_price)',
                    ['order_id' => $savedId] + $item
                );
                if ($status === 'completed') {
                    $this->execute('UPDATE products SET stock_quantity = stock_quantity - :quantity WHERE id = :id', [
                        'quantity' => $item['quantity'], 'id' => $item['product_id'],
                    ]);
                }
            }
            $this->model->commit();
        } catch (\Throwable $error) {
            if ($this->model->inTransaction()) {
                $this->model->rollBack();
            }
            throw $error;
        }

        $order = $this->loadOrder($savedId);
        $order = $this->withItems($order);
        $this->ok(['order' => $order], $existing ? 200 : 201);
    }

    private function resolveCustomer($customerId, array $customerInput): ?int
    {
        if ($customerId !== null && $customerId !== '') {
            $customer = $this->row('SELECT id FROM customers WHERE id = :id', ['id' => (int)$customerId]);
            if (!$customer) {
                throw new ApiException('Không tìm thấy khách hàng.', 422, 'CUSTOMER_NOT_FOUND');
            }
            return (int)$customer['id'];
        }
        $phone = preg_replace('/[\s.-]/', '', trim((string)($customerInput['phone'] ?? '')));
        if ($phone === '') {
            return null;
        }
        $name = trim((string)($customerInput['full_name'] ?? ''));
        $address = trim((string)($customerInput['address'] ?? ''));
        $existing = $this->row('SELECT id FROM customers WHERE phone = :phone', ['phone' => $phone]);
        if ($existing) {
            $this->execute('UPDATE customers SET full_name = :name, address = :address WHERE id = :id', [
                'name' => $name !== '' ? $name : 'Khách hàng',
                'address' => $address ?: null,
                'id' => $existing['id'],
            ]);
            return (int)$existing['id'];
        }
        $this->execute('INSERT INTO customers (phone, full_name, address) VALUES (:phone, :name, :address)', [
            'phone' => $phone, 'name' => $name !== '' ? $name : 'Khách hàng', 'address' => $address ?: null,
        ]);
        return (int)$this->model->lastInsertId();
    }

    private function baseSelect(): string
    {
        return 'SELECT o.*, u.first_name AS cashier_first_name, u.last_name AS cashier_last_name, ' .
            "CONCAT(u.first_name, ' ', u.last_name) AS cashier_name, CONCAT(u.first_name, ' ', u.last_name) AS user_name, " .
            'c.full_name AS customer_name, c.phone AS customer_phone, c.address AS customer_address, ' .
            '(SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS product_count, ' .
            '(SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS items_sold ' .
            'FROM orders o JOIN users u ON u.id = o.user_id LEFT JOIN customers c ON c.id = o.customer_id';
    }

    private function loadOrder(int $id): ?array
    {
        return $this->row($this->baseSelect() . ' WHERE o.id = :id LIMIT 1', ['id' => $id]);
    }

    private function withItems(array $order): array
    {
        $items = $this->rows(
            'SELECT oi.*, p.name AS current_product_name, p.image, p.price AS current_price FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = :id ORDER BY oi.id',
            ['id' => $order['id']]
        );
        if ((string)($_SESSION['role'] ?? '') !== 'admin') {
            foreach ($items as &$item) {
                unset($item['import_price']);
            }
        }
        $order['items'] = $items;
        $order['customer'] = [
            'id' => $order['customer_id'],
            'full_name' => $order['customer_name'] ?: $order['customer_snapshot_name'],
            'phone' => $order['customer_phone'] ?: $order['customer_snapshot_phone'],
            'address' => $order['customer_address'] ?: $order['customer_snapshot_address'],
        ];
        $order['user'] = [
            'id' => $order['user_id'],
            'first_name' => $order['cashier_first_name'],
            'last_name' => $order['cashier_last_name'],
            'name' => trim($order['cashier_first_name'] . ' ' . $order['cashier_last_name']),
        ];
        return $order;
    }

    private function assertCanView(array $order): void
    {
        if ((string)($_SESSION['role'] ?? '') !== 'admin' && (int)$order['user_id'] !== $this->currentUserId()) {
            throw new ApiException('Bạn không có quyền truy cập đơn hàng này.', 403, 'FORBIDDEN');
        }
    }

    private function applyDateFilters(array $query, array &$where, array &$params): void
    {
        foreach (['from' => '>=', 'to' => '<='] as $key => $operator) {
            if (!empty($query[$key])) {
                $date = \DateTimeImmutable::createFromFormat('!Y-m-d', (string)$query[$key]);
                if (!$date || $date->format('Y-m-d') !== $query[$key]) {
                    throw new ApiException('Khoảng ngày không hợp lệ.', 422, 'VALIDATION_ERROR');
                }
                $where[] = 'DATE(o.created_at) ' . $operator . ' :' . $key;
                $params[$key] = $query[$key];
            }
        }
    }
}