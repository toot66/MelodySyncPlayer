<?php
// cors.php - apply CORS headers
function apply_cors(): void {
  $origins = $GLOBALS['config']['security']['cors_allow'] ?? [];
  $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
  if (in_array($origin, $origins, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Authorization, Content-Type');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
  }
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
  }
}
