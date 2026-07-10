<?php
require_once __DIR__ . '/../config.php';

$input = json_decode(file_get_contents('php://input'), true);
$key = trim($input['key'] ?? '');
$adminSecret = trim($input['secret'] ?? '');

if ($adminSecret !== 'posadmin2024') {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

if (!$key) {
    jsonResponse(['error' => 'Missing key'], 400);
}

$pdo = getDB();

// Check if key exists
$stmt = $pdo->prepare("SELECT * FROM licenses WHERE product_key = ?");
$stmt->execute([$key]);
if (!$stmt->fetch()) {
    jsonResponse(['error' => 'Key not found'], 404);
}

// Delete in order: blacklist, activations, then license
$pdo->prepare("DELETE FROM blacklist WHERE product_key = ?")->execute([$key]);
$pdo->prepare("DELETE FROM activations WHERE product_key = ?")->execute([$key]);
$pdo->prepare("DELETE FROM licenses WHERE product_key = ?")->execute([$key]);

jsonResponse([
    'valid' => true,
    'message' => "Key $key and all its data deleted permanently."
]);
