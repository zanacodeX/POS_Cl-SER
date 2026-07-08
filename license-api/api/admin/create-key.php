<?php
require_once __DIR__ . '/../config.php';

$input = json_decode(file_get_contents('php://input'), true);
$company = trim($input['company'] ?? '');
$adminSecret = trim($input['secret'] ?? '');

if ($adminSecret !== 'posadmin2024') {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

// Generate a unique key
$key = 'POS-' . strtoupper(substr(md5(uniqid()), 0, 4)) . '-' . strtoupper(substr(md5(uniqid()), 0, 4));

$pdo = getDB();

$stmt = $pdo->prepare("INSERT INTO licenses (product_key, company_name, status) VALUES (?, ?, 'active')");
$stmt->execute([$key, $company]);

jsonResponse([
    'valid' => true,
    'product_key' => $key,
    'company' => $company,
    'message' => 'Key created successfully'
]);
