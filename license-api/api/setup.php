<?php
require_once __DIR__ . '/config.php';

// Get the actual MySQL host from PHP
$mysqlHost = ini_get('mysqli.default_host') ?: 'localhost';
$mysqlVersion = '';

try {
    $pdo = getDB();
    $mysqlVersion = $pdo->getAttribute(PDO::ATTR_SERVER_VERSION);
} catch (Exception $e) {
    // Will retry below
}

echo "<h1>License API - Setup</h1>";

// Try to find correct MySQL host
$possibleHosts = [
    DB_HOST,
    'sql312.byetcluster.com',
    'sql312.byet.bz',
    'sql312.infinityfree.com',
    'sql123.byetcluster.com',
    'sql123.byet.bz',
    'sql123.infinityfree.com',
    'localhost',
    '127.0.0.1'
];

$connected = false;
foreach ($possibleHosts as $host) {
    try {
        $pdo = new PDO(
            "mysql:host=$host;dbname=" . DB_NAME . ";charset=utf8",
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
        );
        echo "<p style='color:green'>✓ Connected with host: <b>$host</b></p>";
        $connected = true;

        // Create tables
        $pdo->exec("CREATE TABLE IF NOT EXISTS licenses (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_key VARCHAR(50) UNIQUE NOT NULL,
            company_name VARCHAR(255),
            status ENUM('active','used','deactivated') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB");

        $pdo->exec("CREATE TABLE IF NOT EXISTS activations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            product_key VARCHAR(50) NOT NULL,
            mac_address VARCHAR(50) NOT NULL,
            company_name VARCHAR(255),
            domain_url VARCHAR(255),
            activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_mac (mac_address)
        ) ENGINE=InnoDB");

        $pdo->exec("CREATE TABLE IF NOT EXISTS blacklist (
            id INT AUTO_INCREMENT PRIMARY KEY,
            mac_address VARCHAR(50) NOT NULL,
            product_key VARCHAR(50),
            reason VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uk_mac (mac_address)
        ) ENGINE=InnoDB");

        echo "<p style='color:green'>✓ All tables created successfully!</p>";
        break;
    } catch (PDOException $e) {
        // Try next host
    }
}

if (!$connected) {
    echo "<p style='color:red'>✗ Could not connect to MySQL with any host.</p>";
    echo "<p>The correct MySQL host should be visible in your <b>InfinityFree cPanel → MySQL Databases</b>.</p>";
}

echo "<hr><h3>Server Info</h3>";
echo "<pre>";
echo "Server: " . ($_SERVER['SERVER_NAME'] ?? 'unknown') . "\n";
echo "Document Root: " . ($_SERVER['DOCUMENT_ROOT'] ?? 'unknown') . "\n";
echo "PHP Version: " . phpversion() . "\n";
echo "</pre>";

echo "<hr><h3>Next Steps</h3>";
echo "<ol>";
echo "<li>Update DB_HOST in api/config.php with the correct MySQL host</li>";
echo "<li>Run this setup again to create tables</li>";
echo "<li>Delete setup.php when done</li>";
echo "</ol>";
