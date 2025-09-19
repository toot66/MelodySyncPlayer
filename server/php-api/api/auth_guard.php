<?php
// auth_guard.php - validate bearer token from sessions table
require_once __DIR__ . '/bootstrap.php';

function require_auth(): int {
  $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
  if (!preg_match('/Bearer\s+(.*)/i', $auth, $m)) {
    json(['message' => 'Unauthorized'], 401);
  }
  $token = $m[1];
  $stmt = db()->prepare('SELECT admin_id, expires_at FROM sessions WHERE token=? LIMIT 1');
  $stmt->execute([$token]);
  $row = $stmt->fetch();
  if (!$row) json(['message' => 'Unauthorized'], 401);
  if (strtotime($row['expires_at']) <= time()) {
    $del = db()->prepare('DELETE FROM sessions WHERE token=?');
    $del->execute([$token]);
    json(['message' => 'Token Expired'], 401);
  }
  return (int)$row['admin_id'];
}
