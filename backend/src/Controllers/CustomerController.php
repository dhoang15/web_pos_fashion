<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\Request;

final class CustomerController extends Controller
{
    public function index(Request $request): void
    {
        $query = trim((string)($request->query()['search'] ?? ''));
        $params = [];
        $where = '';
        if ($query !== '') {
            $where = ' WHERE c.full_name LIKE :search_name OR c.phone LIKE :search_phone';
            $params['search_name'] = '%' . $query . '%';
            $params['search_phone'] = '%' . $query . '%';
        }
        $this->ok($this->rows(
            'SELECT c.*, COUNT(DISTINCT CASE WHEN o.status = "completed" THEN o.id END) AS order_count, ' .
            'COALESCE(SUM(CASE WHEN o.status = "completed" THEN o.total_amount ELSE 0 END), 0) AS total_spent ' .
            'FROM customers c LEFT JOIN orders o ON o.customer_id = c.id' . $where .
            ' GROUP BY c.id ORDER BY c.created_at DESC',
            $params
        ));
    }

    public function lookup(Request $request): void
    {
        $phone = preg_replace('/[\s.-]/', '', trim((string)($request->query()['phone'] ?? '')));
        if ($phone === '') {
            $this->ok(['customer' => null]);
            return;
        }
        $customer = $this->row('SELECT * FROM customers WHERE phone = :phone LIMIT 1', ['phone' => $phone]);
        $this->ok(['customer' => $customer]);
    }
}