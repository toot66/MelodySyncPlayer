<?php
// admin_account.php - change admin username/password
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/cors.php';
require __DIR__ . '/auth_guard.php';
$GLOBALS['config'] = $GLOBALS['config'] ?? require __DIR__ . '/config.php';
apply_cors();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
  json(['message' => 'Method Not Allowed'], 405);
}

$adminId = require_auth();
$input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$current = trim($input['currentPassword'] ?? '');
$newUsername = isset($input['newUsername']) ? trim($input['newUsername']) : null;
$newPassword = isset($input['newPassword']) ? trim($input['newPassword']) : null;

if (!$current) {
  json(['message' => '当前密码必填'], 400);
}

// 拉取当前管理员
$stmt = db()->prepare('SELECT * FROM admins WHERE id=? LIMIT 1');
$stmt->execute([$adminId]);
$admin = $stmt->fetch();
if (!$admin) {
  json(['message' => 'Admin Not Found'], 404);
}

if (!password_verify($current, $admin['password_hash'])) {
  json(['message' => '当前密码不正确'], 401);
}

$sets = [];
$vals = [];

if ($newUsername !== null && $newUsername !== '') {
  $sets[] = 'username = ?';
  $vals[] = $newUsername;
}
if ($newPassword !== null && $newPassword !== '') {
  $hash = password_hash($newPassword, PASSWORD_DEFAULT);
  $sets[] = 'password_hash = ?';
  $vals[] = $hash;
}

if (!$sets) {
  json(['message' => '没有需要更新的内容'], 400);
}

$vals[] = $adminId;
$sql = 'UPDATE admins SET ' . implode(', ', $sets) . ' WHERE id=?';
$up = db()->prepare($sql);
$up->execute($vals);

json(['ok' => true, 'username' => $newUsername ?: $admin['username']]);
