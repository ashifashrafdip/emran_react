<?php
include "config.php";

$ADMIN_USER = "admin_panel_for_emran";
$ADMIN_PASS = "Emran2002QW!@";

if (isset($_POST['login'])) {
    if (
        $_POST['username'] === $ADMIN_USER &&
        $_POST['password'] === $ADMIN_PASS
    ) {
        $_SESSION['admin'] = true;
        header("Location: dashboard.php");
        exit;
    } else {
        $error = "Wrong username or password";
    }
}
?>
<!DOCTYPE html>
<html>
<head>
<title>Admin Login</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">

<div class="container mt-5">
<div class="col-md-4 mx-auto card p-4">
<h4 class="text-center">Admin Login</h4>

<?php if(isset($error)) echo "<p class='text-danger'>$error</p>"; ?>

<form method="post">
<input type="text" name="username" class="form-control mb-2" placeholder="Username" required>
<input type="password" name="password" class="form-control mb-2" placeholder="Password" required>
<button name="login" class="btn btn-dark w-100">Login</button>
</form>

</div>
</div>
</body>
</html>

