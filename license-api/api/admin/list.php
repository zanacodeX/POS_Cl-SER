<?php
require_once __DIR__ . '/../config.php';

$adminSecret = trim($_GET['secret'] ?? '');

if ($adminSecret !== 'posadmin2024') {
    jsonResponse(['error' => 'Unauthorized'], 401);
}

$pdo = getDB();

$licenses = $pdo->query("SELECT * FROM licenses ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);
$activations = $pdo->query("SELECT * FROM activations ORDER BY activated_at DESC")->fetchAll(PDO::FETCH_ASSOC);
$blacklist = $pdo->query("SELECT * FROM blacklist ORDER BY created_at DESC")->fetchAll(PDO::FETCH_ASSOC);

jsonResponse([
    'licenses' => $licenses,
    'activations' => $activations,
    'blacklist' => $blacklist
]);
