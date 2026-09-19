<?php
class Database {
    private static $instance = null;
    private $connection;
    private function__construct() {
        try{
            $this->connection = new PDO(
                'mysql:host=localhost;dbname=my_database',
                'username',
                'password'
            );
        } catch(){

        }
    }
}
?>