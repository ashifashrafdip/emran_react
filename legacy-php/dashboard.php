<?php
include "config.php";

/* 🔐 Security */
if (!isset($_SESSION['admin']) || $_SESSION['admin'] !== true) {
    header("Location: login.php");
    exit;
}

/* Save Coupon */
if (isset($_POST['save_coupon'])) {
    $coupon = mysqli_real_escape_string($conn, $_POST['coupon']);
    mysqli_query($conn, "INSERT INTO coupons (coupon_code) VALUES ('$coupon')");
}

/* Fetch Users */
$users = mysqli_query($conn, "SELECT * FROM users ORDER BY id DESC");

/* Last Coupon */
$cq = mysqli_query($conn, "SELECT * FROM coupons ORDER BY id DESC LIMIT 1");
$lastCoupon = mysqli_fetch_assoc($cq);
?>
<!DOCTYPE html>
<html>
<head>
<title>Admin Dashboard</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>

<nav class="navbar navbar-dark bg-dark px-3">
<span class="navbar-brand">Admin Dashboard</span>
<a href="logout.php" class="btn btn-danger btn-sm">Logout</a>
</nav>

<div class="container mt-4">

<h4>All Users</h4>
<table class="table table-bordered">
<tr class="table-dark">
<th>ID</th><th>Email</th><th>Password</th><th>Created</th><th>Action</th>
</tr>

<?php while($u = mysqli_fetch_assoc($users)) { ?>
<tr>
<td><?= $u['id'] ?></td>
<td><?= htmlspecialchars($u['email']) ?></td>
<td><?= htmlspecialchars($u['passw']) ?></td>
<td><?= $u['created_at'] ?></td>
<td>
<a href="delete_user.php?id=<?= $u['id'] ?>"
onclick="return confirm('Delete user?')"
class="btn btn-danger btn-sm">Delete</a>
</td>
</tr>
<?php } ?>
</table>

<hr>

<h4>Add Coupon</h4>
<form method="post">
<input type="text" name="coupon" class="form-control mb-2"
placeholder="Enter coupon code" required>
<button name="save_coupon" class="btn btn-success">Save TAP</button>
</form>

<div class="alert alert-info mt-3">
<b>Last Coupon:</b>
<?= $lastCoupon['coupon_code'] ?? 'No coupon yet'; ?>
</div>

</div>
</body>
</html>
