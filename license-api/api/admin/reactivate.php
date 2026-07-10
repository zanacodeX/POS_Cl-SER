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

// Remove key from blacklist
$stmt = $pdo->prepare("DELETE FROM blacklist WHERE product_key = ?");
$stmt->execute([$key]);
$deleted = $stmt->rowCount();

// Check if key has existing activations and set appropriate status
$stmt = $pdo->prepare("SELECT COUNT(*) AS cnt FROM activations WHERE product_key = ?");
$stmt->execute([$key]);
$activationCount = (int)$stmt->fetch(PDO::FETCH_ASSOC)['cnt'];
$newStatus = $activationCount > 0 ? 'used' : 'active';
$pdo->prepare("UPDATE licenses SET status = ? WHERE product_key = ?")->execute([$newStatus, $key]);

jsonResponse([
    'valid' => true,
    'message' => "Key reactivated. $deleted blacklist entries removed."
]);
