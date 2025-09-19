<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/cors.php';
require __DIR__ . '/auth_guard.php';
$GLOBALS['config'] = $GLOBALS['config'] ?? require __DIR__ . '/config.php';
apply_cors();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$id = isset($_GET['id']) ? (int)$_GET['id'] : null;

if ($method === 'GET') {
  $page = max(1, (int)($_GET['page'] ?? 1));
  $pageSize = min(100, max(1, (int)($_GET['pageSize'] ?? 50)));
  $offset = ($page - 1) * $pageSize;

  $total = (int)db()->query('SELECT COUNT(*) AS c FROM donations')->fetch()['c'];
  $stmt = db()->prepare('SELECT * FROM donations ORDER BY date DESC, id DESC LIMIT ? OFFSET ?');
  $stmt->bindValue(1, $pageSize, PDO::PARAM_INT);
  $stmt->bindValue(2, $offset, PDO::PARAM_INT);
  $stmt->execute();
  $list = $stmt->fetchAll();
  json(['list' => $list, 'total' => $total, 'page' => $page, 'pageSize' => $pageSize]);
}

if ($method === 'POST') {
  require_auth();
  $input = json_decode(file_get_contents('php://input'), true) ?: $_POST;
  $name = trim($input['name'] ?? '');
  $amount = (float)($input['amount'] ?? 0);
  $date = trim($input['date'] ?? '');
  if (!$name || !$amount || !$date) json(['message' => 'Bad Request'], 400);
  $message = trim($input['message'] ?? '');
  $avatar = trim($input['avatar'] ?? '');
  $badge = trim($input['badge'] ?? '');
  $badgeColor = trim($input['badgeColor'] ?? '');

  $stmt = db()->prepare('INSERT INTO donations (name, amount, date, message, avatar, badge, badge_color) VALUES (?,?,?,?,?,?,?)');
  $stmt->execute([$name, $amount, $date, $message, $avatar, $badge, $badgeColor]);
  json(['id' => db()->lastInsertId()], 201);
}

if ($method === 'PUT' && $id) {
  require_auth();
  $input = json_decode(file_get_contents('php://input'), true) ?: [];
  $fields = ['name','amount','date','message','avatar','badge','badgeColor'];
  $map = ['badgeColor' => 'badge_color'];
  $set = [];
  $vals = [];
  foreach ($fields as $f) {
    if (array_key_exists($f, $input)) {
      $col = $map[$f] ?? $f;
      $set[] = "$col = ?";
      $vals[] = $input[$f];
    }
  }
  if (!$set) json(['message' => 'Nothing to update'], 400);
  $vals[] = $id;
  $sql = 'UPDATE donations SET '.implode(',', $set).' WHERE id=?';
  $stmt = db()->prepare($sql);
  $stmt->execute($vals);
  json(['ok' => true]);
}

if ($method === 'DELETE' && $id) {
  require_auth();
  $stmt = db()->prepare('DELETE FROM donations WHERE id=?');
  $stmt->execute([$id]);
  json(['ok' => true]);
}

json(['message' => 'Not Found'], 404);
