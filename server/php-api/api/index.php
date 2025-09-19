<?php
// Simple router for /api
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH) ?: '';
if (preg_match('#/api/donations(?:\.php)?$#', $uri)) {
  require __DIR__ . '/donations.php';
  exit;
}
if (preg_match('#/api/auth(?:\.php)?$#', $uri)) {
  require __DIR__ . '/auth.php';
  exit;
}
if (preg_match('#/api/downloads(?:\.php)?$#', $uri)) {
  require __DIR__ . '/downloads.php';
  exit;
}
if (preg_match('#/api/admin_account(?:\.php)?$#', $uri)) {
  require __DIR__ . '/admin_account.php';
  exit;
}
if (preg_match('#/api/downloads_manage(?:\.php)?$#', $uri)) {
  require __DIR__ . '/downloads_manage.php';
  exit;
}
http_response_code(404);
echo 'Not Found';
