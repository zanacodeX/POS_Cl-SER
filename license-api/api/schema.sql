-- License API tables for Pixel Art POS
-- Run in phpMyAdmin if setup.php can't be reached yet

CREATE TABLE IF NOT EXISTS licenses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_key VARCHAR(50) UNIQUE NOT NULL,
    company_name VARCHAR(255),
    status ENUM('active','used','deactivated') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS activations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_key VARCHAR(50) NOT NULL,
    mac_address VARCHAR(50) NOT NULL,
    company_name VARCHAR(255),
    domain_url VARCHAR(255),
    activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_mac (mac_address)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS blacklist (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mac_address VARCHAR(50) NOT NULL,
    product_key VARCHAR(50),
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_mac (mac_address)
) ENGINE=InnoDB;

-- Insert a test admin key (optional)
-- INSERT INTO licenses (product_key, company_name, status) VALUES ('POS-TEST-ABCD', 'Test Company', 'active');
