<?php
// /admin/logout.php - destroy session and revoke token
session_start();
if (isset($_SESSION['token'])) {
  $token = $_SESSION['token'];
  $scheme = isset($_SERVER['HTTPS']) ? 'https' : 'http';
  $api = $scheme . '://' . $_SERVER['HTTP_HOST'] . '/api/auth.php?action=logout';
  @file_get_contents($api, false, stream_context_create([
    'http' => [
      'method' => 'POST',
      'header' => 'Authorization: Bearer ' . $token . "\r\n",
      'timeout' => 5
    ]
  ]));
}
session_destroy();
header('Location: /admin/index.php');
