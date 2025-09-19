<?php
// downloads_manage.php - admin-only upload/delete downloads
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/cors.php';
require __DIR__ . '/auth_guard.php';
$GLOBALS['config'] = $GLOBALS['config'] ?? require __DIR__ . '/config.php';
apply_cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$adminId = require_auth();

if ($method === 'POST') {
  // Expect multipart/form-data: file, platform, version, notes
  if (empty($_FILES['file'])) {
    json(['message' => '缺少文件'], 400);
  }
  $platform = $_POST['platform'] ?? '';
  $version = trim($_POST['version'] ?? '');
  $notes = trim($_POST['notes'] ?? '');
  $allowed = ['windows','macos','linux','android'];
  if (!in_array($platform, $allowed, true)) json(['message'=>'平台不合法'], 400);
  if ($version === '') json(['message'=>'版本号必填'], 400);

  $f = $_FILES['file'];
  if ($f['error'] !== UPLOAD_ERR_OK) json(['message'=>'上传失败: '.$f['error']], 400);

  // Ensure target dir /files exists (site root/files)
  $root = dirname(__DIR__, 1); // /server/php-api -> parent is /server/php-api
  // In deployed hosting, this script will be in /api, so root should be dirname(__DIR__) which is site root
  $siteRoot = dirname(__DIR__); // /api -> site root
  $targetDir = $siteRoot . '/files';
  if (!is_dir($targetDir)) {
    @mkdir($targetDir, 0755, true);
  }

  $orig = $f['name'];
  $safeName = preg_replace('/[^A-Za-z0-9._-]+/', '_', $orig);
  $stamp = date('Ymd_His');
  $finalName = $platform . '_' . $version . '_' . $stamp . '_' . $safeName;
  $destPath = $targetDir . '/' . $finalName;

  if (!move_uploaded_file($f['tmp_name'], $destPath)) {
    json(['message'=>'保存文件失败'], 500);
  }
  $size = filesize($destPath);
  $url = '/files/' . $finalName;

  $stmt = db()->prepare('INSERT INTO downloads (platform, version, file_name, file_size, url, notes) VALUES (?,?,?,?,?,?)');
  $stmt->execute([$platform, $version, $finalName, $size, $url, $notes]);
  json(['ok'=>true, 'url'=>$url]);
}

if ($method === 'DELETE') {
  $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
  if (!$id) json(['message'=>'缺少id'], 400);
  // Remove DB record and try to delete file
  $sel = db()->prepare('SELECT file_name FROM downloads WHERE id=?');
  $sel->execute([$id]);
  $row = $sel->fetch();
  $del = db()->prepare('DELETE FROM downloads WHERE id=?');
  $del->execute([$id]);
  if ($row && isset($row['file_name'])) {
    $siteRoot = dirname(__DIR__);
    $path = $siteRoot . '/files/' . $row['file_name'];
    if (is_file($path)) @unlink($path);
  }
  json(['ok'=>true]);
}

http_response_code(405);
header('Allow: POST, DELETE');
echo 'Method Not Allowed';
