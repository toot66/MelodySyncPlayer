<?php
// downloads.php - public list downloads (no auth for GET)
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/cors.php';
$GLOBALS['config'] = $GLOBALS['config'] ?? require __DIR__ . '/config.php';
apply_cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'GET') {
  http_response_code(405);
  header('Allow: GET');
  echo 'Method Not Allowed';
  exit;
}

$platform = isset($_GET['platform']) ? trim($_GET['platform']) : null; // windows|macos|linux|android
$latest = (isset($_GET['latest']) && $_GET['latest'] == '1');

try {
  if ($latest) {
    if ($platform) {
      $stmt = db()->prepare("SELECT * FROM downloads WHERE platform=? ORDER BY id DESC LIMIT 1");
      $stmt->execute([$platform]);
      $row = $stmt->fetch();
      json($row ?: []);
    } else {
      // latest for each platform
      $plats = ['windows','macos','linux','android'];
      $out = [];
      foreach ($plats as $p) {
        $s = db()->prepare("SELECT * FROM downloads WHERE platform=? ORDER BY id DESC LIMIT 1");
        $s->execute([$p]);
        $out[$p] = $s->fetch() ?: null;
      }
      json($out);
    }
  } else {
    if ($platform) {
      $stmt = db()->prepare("SELECT * FROM downloads WHERE platform=? ORDER BY id DESC LIMIT 100");
      $stmt->execute([$platform]);
      json($stmt->fetchAll());
    } else {
      $stmt = db()->query("SELECT * FROM downloads ORDER BY id DESC LIMIT 500");
      json($stmt->fetchAll());
    }
  }
} catch (Throwable $e) {
  json(['message'=>'Server Error'], 500);
}
