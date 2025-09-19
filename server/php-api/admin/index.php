<?php
// /admin/index.php - login page
session_start();
$error = '';
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'POST') {
  $username = trim($_POST['username'] ?? '');
  $password = trim($_POST['password'] ?? '');
  // Adjust the API base if you deploy under subdir
  $api = rtrim((isset($_SERVER['HTTPS'])?'https':'http') . '://' . $_SERVER['HTTP_HOST'], '/') . '/api/auth.php?action=login';
  $ctx = stream_context_create([
    'http' => [
      'method'  => 'POST',
      'header'  => "Content-Type: application/json\r\n",
      'content' => json_encode(['username'=>$username,'password'=>$password], JSON_UNESCAPED_UNICODE),
      'timeout' => 10
    ]
  ]);
  $resp = @file_get_contents($api, false, $ctx);
  $data = json_decode($resp, true);
  if (!empty($data['token'])) {
    $_SESSION['token'] = $data['token'];
    header('Location: /admin/dashboard.php');
    exit;
  } else {
    $error = '登录失败，请检查账号或密码';
  }
}
?><!doctype html>
<meta charset="utf-8">
<title>Admin Login - Melody Sync Player</title>
<style>
body{font-family:system-ui;background:#0b1220;color:#e5e7eb}
.wrap{max-width:380px;margin:10vh auto;background:#111827;padding:24px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.35)}
input,button{width:100%;padding:10px;border-radius:8px;border:1px solid #374151;background:#0b1220;color:#e5e7eb}
button{background:#10b981;border:none;cursor:pointer}
button:hover{background:#34d399}
.label{margin-top:12px;margin-bottom:6px;font-size:14px;color:#9ca3af}
.error{color:#fca5a5;margin:6px 0;height:18px}
.title{font-size:20px;font-weight:700;margin-bottom:12px}
</style>
<div class="wrap">
  <div class="title">Melody Sync Player 管理登录</div>
  <form method="post">
    <div class="error"><?=htmlspecialchars($error, ENT_QUOTES)?></div>
    <div class="label">账号</div>
    <input name="username" required>
    <div class="label">密码</div>
    <input name="password" type="password" required>
    <div style="margin-top:14px"></div>
    <button type="submit">登录</button>
  </form>
</div>
