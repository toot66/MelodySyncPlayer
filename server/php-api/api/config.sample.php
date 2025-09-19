<?php
// Copy this file to config.php and fill your database credentials
return [
  'db' => [
    'host' => 'sql111.infinityfree.com',
    'name' => 'if0_39974861_toot00',
    'user' => 'if0_39974861',
    'pass' => 'Lyl941120',
    'charset' => 'utf8mb4',
  ],
  'security' => [
    'token_secret' => 'change_this_to_random_64_chars',
    'cors_allow' => [
      'http://melodysync.xo.je',
      'https://melodysync.xo.je',
      'http://192.168.1.8:5173'
    ],
    'token_ttl_minutes' => 120
  ]
];
