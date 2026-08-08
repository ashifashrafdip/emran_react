<?php
include "config.php";

if (!isset($_SESSION['admin'])) {
    http_response_code(403);
    exit;
}

$r = mysqli_query($conn, "SELECT MAX(id) AS last_id FROM users");
echo json_encode(mysqli_fetch_assoc($r));

