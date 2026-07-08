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

// Find all activations for this key
$stmt = $pdo->prepare("SELECT * FROM activations WHERE product_key = ?");
$stmt->execute([$key]);
$activations = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($activations as $act) {
    $pdo->prepare("INSERT IGNORE INTO blacklist (mac_address, product_key, reason) VALUES (?, ?, 'Deactivated by admin')")
        ->execute([$act['mac_address'], $key]);
}

// Mark license as deactivated
$pdo->prepare("UPDATE licenses SET status = 'deactivated' WHERE product_key = ?")->execute([$key]);

jsonResponse([
    'valid' => true,
    'message' => 'Key deactivated. Server will stop on next boot.',
    'affected_macs' => array_column($activations, 'mac_address')
]);
