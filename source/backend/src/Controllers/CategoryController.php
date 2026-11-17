<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiException;
use App\Core\Request;

final class CategoryController extends Controller
{
    public function index(Request $request): void
    {
        $this->ok($this->rows(
            "SELECT c.*, CONCAT(u.first_name, ' ', u.last_name) AS creator_name, " .
            '(SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count ' .
            'FROM categories c LEFT JOIN users u ON u.id = c.created_by ORDER BY c.name'
        ));
    }

    public function create(Request $request): void
    {
        $input = $request->input();
        $name = $this->required($input, 'name', 100);
        $this->execute('INSERT INTO categories (name, description, created_by) VALUES (:name, :description, :created_by)', [
            'name' => $name,
            'description' => trim((string)($input['description'] ?? '')) ?: null,
            'created_by' => $this->currentUserId(),
        ]);
        $this->ok(['id' => (int)$this->model->lastInsertId()], 201);
    }

    public function update(Request $request): void
    {
        $input = $request->input();
        if (!$this->execute('UPDATE categories SET name = :name, description = :description WHERE id = :id', [
            'name' => $this->required($input, 'name', 100),
            'description' => trim((string)($input['description'] ?? '')) ?: null,
            'id' => (int)$request->param('id'),
        ]) && !$this->row('SELECT id FROM categories WHERE id = :id', ['id' => (int)$request->param('id')])) {
            throw new ApiException('Không tìm thấy danh mục.', 404, 'CATEGORY_NOT_FOUND');
        }
        $this->ok(['message' => 'Đã cập nhật danh mục.']);
    }

    public function delete(Request $request): void
    {
        try {
            $deleted = $this->execute('DELETE FROM categories WHERE id = :id', ['id' => (int)$request->param('id')]);
        } catch (\PDOException $error) {
            if ((string)$error->getCode() === '23000') {
                throw new ApiException('Không thể xóa danh mục đang có sản phẩm.', 409, 'CATEGORY_IN_USE');
            }
            throw $error;
        }
        if (!$deleted) {
            throw new ApiException('Không tìm thấy danh mục.', 404, 'CATEGORY_NOT_FOUND');
        }
        $this->ok(['message' => 'Đã xóa danh mục.']);
    }
}