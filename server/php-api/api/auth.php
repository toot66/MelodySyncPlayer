<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/cors.php';
$GLOBALS['config'] = $GLOBALS['config'] ?? require __DIR__ . '/config.php';
apply_cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

if ($method === 'POST' && $action === 'login') {
  $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
  $username = trim($input['username'] ?? '');
  $password = trim($input['password'] ?? '');
  if (!$username || !$password) {
    json(['message' => 'Bad Request'], 400);
  }
  $stmt = db()->prepare('SELECT * FROM admins WHERE username=? LIMIT 1');
  $stmt->execute([$username]);
  $admin = $stmt->fetch();
  if (!$admin || !password_verify($password, $admin['password_hash'])) {
    json(['message' => 'Unauthorized'], 401);
  }
  $secret = $GLOBALS['config']['security']['token_secret'];
  $raw = bin2hex(random_bytes(16)) . '|' . time() . '|' . $admin['id'];
  $token = hash_hmac('sha256', $raw, $secret);
  $ttl = (int)($GLOBALS['config']['security']['token_ttl_minutes'] ?? 120);
  $expires = (new DateTime("+{$ttl} minutes"))->format('Y-m-d H:i:s');
  $ins = db()->prepare('INSERT INTO sessions (admin_id, token, expires_at) VALUES (?,?,?)');
  $ins->execute([$admin['id'], $token, $expires]);
  json(['token' => $token, 'expiresIn' => $ttl * 60]);
}

if ($method === 'POST' && $action === 'logout') {
  $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (preg_match('/Bearer\s+(.*)/i', $auth, $m)) {
    $token = $m[1];
    $del = db()->prepare('DELETE FROM sessions WHERE token=?');
    $del->execute([$token]);
  }
  json(['ok' => true]);
}

json(['message' => 'Not Found'], 404);
