<?php
include "config.php";
if (!isset($_SESSION['admin'])) {
    header("Location: login.php");
    exit;
}

$id = intval($_GET['id']);
mysqli_query($conn, "DELETE FROM users WHERE id=$id");

header("Location: dashboard.php");
