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

// Find the earliest activation
$stmt = $pdo->prepare("SELECT id, mac_address FROM activations WHERE product_key = ? ORDER BY activated_at ASC LIMIT 1");
$stmt->execute([$key]);
$original = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$original) {
    jsonResponse(['error' => 'No activations found for this key'], 404);
}

// Delete all activations except the original
$stmt = $pdo->prepare("DELETE FROM activations WHERE product_key = ? AND id != ?");
$stmt->execute([$key, $original['id']]);
$deleted = $stmt->rowCount();

jsonResponse([
    'valid' => true,
    'message' => "Cleaned up. Kept activation for $original[mac_address], removed $deleted duplicate(s)."
]);
