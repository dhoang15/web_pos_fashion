<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiException;
use App\Core\Request;

final class ProductController extends Controller
{
    public function index(Request $request): void
    {
        $columns = "p.id, p.name, p.sku, p.category_id, p.barcode, p.price, p.stock_quantity, p.low_stock_threshold, p.size, p.color, p.material, p.image, p.description, p.status, p.created_at, p.updated_at, c.name AS category_name, (SELECT COUNT(*) FROM order_items oi WHERE oi.product_id = p.id) AS order_count";
        $admin = (string)($_SESSION['role'] ?? '') === 'admin';
        if ($admin) {
            $columns .= ', p.import_price';
        }
        $where = [];
        $params = [];
        $query = $request->query();
        if (($query['status'] ?? '') === 'active') {
            $where[] = "p.status = 'active'";
        } elseif (in_array($query['status'] ?? '', ['active', 'inactive'], true)) {
            $where[] = 'p.status = :status';
            $params['status'] = $query['status'];
        }
        if (isset($query['category_id']) && ctype_digit((string)$query['category_id'])) {
            $where[] = 'p.category_id = :category_id';
            $params['category_id'] = (int)$query['category_id'];
        }
        $sql = 'SELECT ' . $columns . ' FROM products p JOIN categories c ON c.id = p.category_id';
        if ($where) {
            $sql .= ' WHERE ' . implode(' AND ', $where);
        }
        $sql .= ' ORDER BY p.name';
        $products = $this->rows($sql, $params);
        foreach ($products as &$product) {
            if (!empty($product['image']) && strpos($product['image'], '/') !== 0 && !preg_match('#^https?://#i', $product['image'])) {
                $product['image'] = '/uploads/' . rawurlencode(basename($product['image']));
            }
        }
        $this->ok($products);
    }

    public function create(Request $request): void
    {
        $input = $request->input();
        $data = $this->validateProduct($input);
        $image = $this->uploadImage($request, 'image_file', ['image/png', 'image/jpeg', 'image/webp']);
        if ($image !== null) {
            $data['image'] = $image;
        }
        $data['last_updated_by'] = $this->currentUserId();
        $this->execute(
            'INSERT INTO products (name, sku, category_id, barcode, import_price, price, stock_quantity, low_stock_threshold, size, color, material, image, description, status, last_updated_by) ' .
            'VALUES (:name, :sku, :category_id, :barcode, :import_price, :price, :stock_quantity, :low_stock_threshold, :size, :color, :material, :image, :description, :status, :last_updated_by)',
            $data
        );
        $this->ok(['id' => (int)$this->model->lastInsertId()], 201);
    }

    public function update(Request $request): void
    {
        $input = $request->input();
        $id = (int)$request->param('id');
        $existing = $this->row('SELECT image FROM products WHERE id = :id', ['id' => $id]);
        if (!$existing) {
            throw new ApiException('Không tìm thấy sản phẩm.', 404, 'PRODUCT_NOT_FOUND');
        }
        $input['id'] = $id;
        $data = $this->validateProduct($input);
        $data['last_updated_by'] = $this->currentUserId();
        $data['id'] = $id;
        $image = $this->uploadImage($request, 'image_file', ['image/png', 'image/jpeg', 'image/webp']);
        if ($image !== null) {
            $data['image'] = $image;
        } else {
            $data['image'] = $input['image'] ?? $existing['image'];
        }
        $this->execute(
            'UPDATE products SET name = :name, sku = :sku, category_id = :category_id, barcode = :barcode, import_price = :import_price, price = :price, stock_quantity = :stock_quantity, low_stock_threshold = :low_stock_threshold, size = :size, color = :color, material = :material, image = :image, description = :description, status = :status, last_updated_by = :last_updated_by WHERE id = :id',
            $data
        );
        $this->ok(['message' => 'Đã cập nhật sản phẩm.']);
    }

    public function delete(Request $request): void
    {
        try {
            $deleted = $this->execute('DELETE FROM products WHERE id = :id', ['id' => (int)$request->param('id')]);
        } catch (\PDOException $error) {
            if ((string)$error->getCode() === '23000') {
                throw new ApiException('Không thể xóa sản phẩm đã có trong hóa đơn.', 409, 'PRODUCT_ALREADY_SOLD');
            }
            throw $error;
        }
        if (!$deleted) {
            throw new ApiException('Không tìm thấy sản phẩm.', 404, 'PRODUCT_NOT_FOUND');
        }
        $this->ok(['message' => 'Đã xóa sản phẩm.']);
    }

    private function validateProduct(array $input): array
    {
        $name = $this->required($input, 'name', 100);
        $barcode = $this->required($input, 'barcode', 100);
        $categoryId = filter_var($input['category_id'] ?? null, FILTER_VALIDATE_INT);
        if (!$categoryId || !$this->row('SELECT id FROM categories WHERE id = :id', ['id' => $categoryId])) {
            throw new ApiException('Danh mục không hợp lệ.', 422, 'VALIDATION_ERROR', ['category_id' => ['Chọn danh mục tồn tại.']]);
        }
        foreach (['price', 'import_price'] as $field) {
            if (!isset($input[$field]) || !is_numeric($input[$field]) || (float)$input[$field] < 0) {
                throw new ApiException('Giá sản phẩm không hợp lệ.', 422, 'VALIDATION_ERROR', [$field => ['Giá phải là số không âm.']]);
            }
        }
        foreach (['stock_quantity', 'low_stock_threshold'] as $field) {
            if (!isset($input[$field]) || filter_var($input[$field], FILTER_VALIDATE_INT) === false || (int)$input[$field] < 0) {
                throw new ApiException('Số lượng tồn kho không hợp lệ.', 422, 'VALIDATION_ERROR', [$field => ['Số lượng phải là số nguyên không âm.']]);
            }
        }
        $status = (string)($input['status'] ?? 'active');
        if (!in_array($status, ['active', 'inactive'], true)) {
            throw new ApiException('Trạng thái sản phẩm không hợp lệ.', 422, 'VALIDATION_ERROR');
        }
        $existingBarcode = $this->row('SELECT id FROM products WHERE barcode = :barcode', ['barcode' => $barcode]);
        if ($existingBarcode && (int)$existingBarcode['id'] !== (int)($input['id'] ?? 0)) {
            throw new ApiException('Mã vạch đã thuộc về sản phẩm khác.', 409, 'BARCODE_EXISTS', ['barcode' => ['Mã vạch đã tồn tại.']]);
        }
        return [
            'name' => $name,
            'sku' => trim((string)($input['sku'] ?? '')) ?: null,
            'category_id' => $categoryId,
            'barcode' => $barcode,
            'import_price' => (float)$input['import_price'],
            'price' => (float)$input['price'],
            'stock_quantity' => (int)$input['stock_quantity'],
            'low_stock_threshold' => (int)$input['low_stock_threshold'],
            'size' => trim((string)($input['size'] ?? '')) ?: null,
            'color' => trim((string)($input['color'] ?? '')) ?: null,
            'material' => trim((string)($input['material'] ?? '')) ?: null,
            'image' => trim((string)($input['image'] ?? '')) ?: null,
            'description' => trim((string)($input['description'] ?? '')) ?: null,
            'status' => $status,
        ];
    }
}