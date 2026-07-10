<?php
require_once __DIR__ . '/config.php';

$input = json_decode(file_get_contents('php://input'), true);
$key = trim($input['key'] ?? '');
$mac = trim($input['mac'] ?? '');

if (!$key || !$mac) {
    jsonResponse(['error' => 'Missing key or mac'], 400);
}

$pdo = getDB();

// Check if MAC is blacklisted
$stmt = $pdo->prepare("SELECT * FROM blacklist WHERE mac_address = ?");
$stmt->execute([$mac]);
if ($stmt->fetch()) {
    jsonResponse([
        'valid' => false,
        'error' => 'License has been deactivated'
    ], 403);
}

// Check if key exists
$stmt = $pdo->prepare("SELECT * FROM licenses WHERE product_key = ?");
$stmt->execute([$key]);
$license = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$license) {
    jsonResponse(['valid' => false, 'error' => 'Invalid product key'], 403);
}

if ($license['status'] === 'deactivated') {
    jsonResponse(['valid' => false, 'error' => 'Product key has been deactivated'], 403);
}

// Check if MAC is registered to this key
$stmt = $pdo->prepare("SELECT * FROM activations WHERE mac_address = ? AND product_key = ?");
$stmt->execute([$mac, $key]);
$activation = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$activation) {
    // Auto-register if key is active and not yet bound
    if ($license['status'] === 'active') {
        $stmt = $pdo->prepare("INSERT INTO activations (product_key, mac_address) VALUES (?, ?) ON DUPLICATE KEY UPDATE product_key = VALUES(product_key)");
        $stmt->execute([$key, $mac]);
        $pdo->prepare("UPDATE licenses SET status = 'used' WHERE product_key = ?")->execute([$key]);
        jsonResponse(['valid' => true, 'message' => 'Activated on first use']);
    } else {
        jsonResponse(['valid' => false, 'error' => 'Not authorized'], 403);
    }
}

jsonResponse(['valid' => true, 'message' => 'OK']);
