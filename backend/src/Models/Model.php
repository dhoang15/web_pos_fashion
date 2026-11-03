<?php
declare(strict_types=1);

namespace App\Models;

use App\Core\Database;
use PDO;

final class Model
{
    private ?PDO $connection = null;

    public function connection(): PDO
    {
        if (!$this->connection instanceof PDO) {
            $this->connection = Database::connection();
        }
        return $this->connection;
    }

    public function rows(string $sql, array $params = []): array
    {
        $statement = $this->connection()->prepare($sql);
        $statement->execute($params);
        return $statement->fetchAll();
    }

    public function row(string $sql, array $params = []): ?array
    {
        $statement = $this->connection()->prepare($sql);
        $statement->execute($params);
        $result = $statement->fetch();
        return $result === false ? null : $result;
    }

    public function execute(string $sql, array $params = []): int
    {
        $statement = $this->connection()->prepare($sql);
        $statement->execute($params);
        return $statement->rowCount();
    }

    public function lastInsertId(): string
    {
        return $this->connection()->lastInsertId();
    }

    public function beginTransaction(): bool
    {
        return $this->connection()->beginTransaction();
    }

    public function commit(): bool
    {
        return $this->connection()->commit();
    }

    public function rollBack(): bool
    {
        return $this->connection()->rollBack();
    }

    public function inTransaction(): bool
    {
        return $this->connection()->inTransaction();
    }
}
