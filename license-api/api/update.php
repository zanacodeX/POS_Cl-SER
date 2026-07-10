<?php
// TEMPORARY — DELETE AFTER USE
// Upload updated PHP files via HTTP POST

require_once __DIR__ . '/config.php';

$input = json_decode(file_get_contents('php://input'), true);
$secret = trim($input['secret'] ?? '');
$file = trim($input['file'] ?? '');
$content = $input['content'] ?? '';

if ($secret !== 'posadmin2024') {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

$allowed = ['validate.php', 'register.php'];
if (!in_array($file, $allowed)) {
    jsonResponse(['error' => 'File not allowed'], 403);
}

$path = __DIR__ . '/' . $file;
$bytes = file_put_contents($path, $content);
if ($bytes !== false) {
    jsonResponse(['success' => true, 'bytes' => $bytes, 'file' => $file]);
} else {
    jsonResponse(['error' => 'Failed to write file'], 500);
}
