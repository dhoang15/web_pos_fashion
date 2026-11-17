<?php
declare(strict_types=1);

namespace App\Controllers;

use App\Core\ApiException;
use App\Core\Request;

final class ReportController extends Controller
{
    public function sales(Request $request): void
    {
        $query = $request->query();
        $from = $this->date($query['from'] ?? null);
        $to = $this->date($query['to'] ?? null);
        if ($from && $to && $from > $to) {
            throw new ApiException('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.', 422, 'VALIDATION_ERROR');
        }
        $isAdmin = (string)($_SESSION['role'] ?? '') === 'admin';
        $userId = $this->currentUserId();
        if ($isAdmin && isset($query['user_id']) && ctype_digit((string)$query['user_id'])) {
            $userId = (int)$query['user_id'];
        }
        $where = ["o.status = 'completed'"];
        $params = [];
        if ($from) {
            $where[] = 'DATE(o.created_at) >= :from';
            $params['from'] = $from;
        }
        if ($to) {
            $where[] = 'DATE(o.created_at) <= :to';
            $params['to'] = $to;
        }
        if (!$isAdmin || !empty($query['user_id'])) {
            $where[] = 'o.user_id = :user_id';
            $params['user_id'] = $userId;
        }
        $condition = implode(' AND ', $where);
        $orders = $this->rows(
            "SELECT o.*, u.first_name AS cashier_first_name, u.last_name AS cashier_last_name, CONCAT(u.first_name, ' ', u.last_name) AS cashier_name, CONCAT(u.first_name, ' ', u.last_name) AS user_name, " .
            'o.customer_snapshot_name AS customer_name, o.customer_snapshot_phone AS customer_phone, ' .
            'COUNT(oi.id) AS product_count, COALESCE(SUM(oi.quantity), 0) AS items_sold ' .
            'FROM orders o JOIN users u ON u.id = o.user_id LEFT JOIN order_items oi ON oi.order_id = o.id ' .
            'WHERE ' . $condition . ' GROUP BY o.id ORDER BY o.created_at DESC',
            $params
        );
        $summary = $this->row(
            'SELECT COUNT(*) AS order_count, COALESCE(SUM(o.total_amount), 0) AS total_revenue, ' .
            'COALESCE(SUM(o.amount_received), 0) AS total_received FROM orders o WHERE ' . $condition,
            $params
        ) ?: ['order_count' => 0, 'total_revenue' => 0, 'total_received' => 0];
        $itemsQuery = str_replace('o.', 'orders_for_items.', $condition);
        $items = $this->row(
            'SELECT COALESCE(SUM(oi.quantity), 0) AS items_sold FROM order_items oi ' .
            'JOIN orders orders_for_items ON orders_for_items.id = oi.order_id WHERE ' . $itemsQuery,
            $params
        );
        $summary['items_sold'] = $items['items_sold'] ?? 0;
        $summary['revenue'] = $summary['total_revenue'];
        if ($isAdmin) {
            $profit = $this->row(
                'SELECT COALESCE(SUM(o.subtotal - o.discount_amount - COALESCE(item_cost.total_cost, 0)), 0) AS total_profit ' .
                'FROM orders o LEFT JOIN (' .
                    'SELECT order_id, SUM(import_price * quantity) AS total_cost ' .
                    'FROM order_items GROUP BY order_id' .
                ') item_cost ON item_cost.order_id = o.id WHERE ' . $condition,
                $params
            );
            $summary['total_profit'] = $profit['total_profit'] ?? 0;
        }
        $trend = $this->rows(
            'SELECT DATE(o.created_at) AS date, SUM(o.total_amount) AS revenue FROM orders o WHERE ' . $condition .
            ' GROUP BY DATE(o.created_at) ORDER BY DATE(o.created_at)',
            $params
        );
        $this->ok(['orders' => $orders, 'summary' => $summary, 'trend' => $trend]);
    }

    private function date($value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', (string)$value);
        if (!$date || $date->format('Y-m-d') !== $value) {
            throw new ApiException('Ngày báo cáo không hợp lệ.', 422, 'VALIDATION_ERROR');
        }
        return (string)$value;
    }
}
