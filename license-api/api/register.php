<?php
require_once __DIR__ . '/config.php';

$input = json_decode(file_get_contents('php://input'), true);
$key = trim($input['key'] ?? '');
$mac = trim($input['mac'] ?? '');
$company = trim($input['company'] ?? '');
$domain = trim($input['domain'] ?? '');

if (!$key || !$mac) {
    jsonResponse(['error' => 'Missing key or mac'], 400);
}

$pdo = getDB();

// Check if key exists and is active
$stmt = $pdo->prepare("SELECT * FROM licenses WHERE product_key = ?");
$stmt->execute([$key]);
$license = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$license) {
    jsonResponse(['error' => 'Invalid product key'], 403);
}

if ($license['status'] === 'deactivated') {
    jsonResponse(['error' => 'Product key has been deactivated'], 403);
}

// Check if MAC is already blacklisted
$stmt = $pdo->prepare("SELECT * FROM blacklist WHERE mac_address = ?");
$stmt->execute([$mac]);
if ($stmt->fetch()) {
    jsonResponse(['error' => 'This server has been deactivated'], 403);
}

// Check if this MAC is already registered to a different key
$stmt = $pdo->prepare("SELECT * FROM activations WHERE mac_address = ?");
$stmt->execute([$mac]);
$existing = $stmt->fetch(PDO::FETCH_ASSOC);

if ($existing) {
    if ($existing['product_key'] !== $key) {
        jsonResponse(['error' => 'This server is already registered with a different key'], 403);
    }
    jsonResponse([
        'valid' => true,
        'message' => 'Already registered',
        'company' => $existing['company_name']
    ]);
}

// If key is already used by another MAC
if ($license['status'] === 'used') {
    $stmt = $pdo->prepare("SELECT * FROM activations WHERE product_key = ?");
    $stmt->execute([$key]);
    $act = $stmt->fetch(PDO::FETCH_ASSOC);
    if ($act && $act['mac_address'] !== $mac) {
        jsonResponse(['error' => 'This key is already activated on another server'], 403);
    }
}

// Register
$stmt = $pdo->prepare("INSERT INTO activations (product_key, mac_address, company_name, domain_url) VALUES (?, ?, ?, ?)");
$stmt->execute([$key, $mac, $company, $domain]);

// Mark key as used
$pdo->prepare("UPDATE licenses SET status = 'used' WHERE product_key = ?")->execute([$key]);

jsonResponse([
    'valid' => true,
    'message' => 'Activated successfully'
]);
