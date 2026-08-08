<?php
$host = "localhost";
$user = "DB_USERNAME";
$pass = "DB_PASSWORD";
$db   = "DB_NAME";

$conn = mysqli_connect($host, $user, $pass, $db);
if (!$conn) {
    die("DB Connection Failed");
}

session_start();
?>
