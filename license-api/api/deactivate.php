<?php
require_once __DIR__ . '/config.php';

$input = json_decode(file_get_contents('php://input'), true);
$key = trim($input['key'] ?? '');
$mac = trim($input['mac'] ?? '');
$adminSecret = trim($input['secret'] ?? '');

// Simple admin auth
if ($adminSecret !== 'posadmin2024') {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

$pdo = getDB();

if ($mac) {
    // Deactivate by MAC
    $stmt = $pdo->prepare("INSERT IGNORE INTO blacklist (mac_address, product_key, reason) VALUES (?, ?, ?)");
    $stmt->execute([$mac, $key, 'Deactivated by admin']);
    
    // Also mark license as deactivated
    if ($key) {
        $pdo->prepare("UPDATE licenses SET status = 'deactivated' WHERE product_key = ?")->execute([$key]);
    }
    
    jsonResponse(['valid' => true, 'message' => 'Deactivated by MAC']);
    
} elseif ($key) {
    // Deactivate by key
    $stmt = $pdo->prepare("SELECT * FROM activations WHERE product_key = ?");
    $stmt->execute([$key]);
    $activations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($activations as $act) {
        $pdo->prepare("INSERT IGNORE INTO blacklist (mac_address, product_key, reason) VALUES (?, ?, ?)")
            ->execute([$act['mac_address'], $key, 'Deactivated by admin (key based)']);
    }
    
    $pdo->prepare("UPDATE licenses SET status = 'deactivated' WHERE product_key = ?")->execute([$key]);
    jsonResponse(['valid' => true, 'message' => 'Deactivated by key']);
    
} else {
    jsonResponse(['error' => 'Missing key or mac'], 400);
}
