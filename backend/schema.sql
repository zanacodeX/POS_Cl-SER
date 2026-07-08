CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('admin','cashier') DEFAULT 'cashier',
  `full_name` VARCHAR(100),
  `phone` VARCHAR(20),
  `active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `products` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `barcode` VARCHAR(50) UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `category_id` INT,
  `batch_no` VARCHAR(50),
  `expiry_date` DATE,
  `mfg_date` DATE,
  `price` DECIMAL(10,2) NOT NULL,
  `cost` DECIMAL(10,2) DEFAULT 0,
  `quantity` INT DEFAULT 0,
  `low_stock_threshold` INT DEFAULT 5,
  `discount_type` ENUM('percentage','flat') DEFAULT NULL,
  `discount_value` DECIMAL(10,2) DEFAULT 0,
  `discount_min_qty` INT DEFAULT 1,
  `discount_valid_from` DATE,
  `discount_valid_to` DATE,
  `bundle_qty` INT DEFAULT NULL,
  `bundle_price` DECIMAL(10,2) DEFAULT NULL,
  `active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_category_id` (`category_id`),
  INDEX `idx_barcode` (`barcode`),
  CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `product_price_tiers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `product_id` INT NOT NULL,
  `min_qty` INT NOT NULL,
  `max_qty` INT DEFAULT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  INDEX `idx_tier_product` (`product_id`),
  CONSTRAINT `fk_tier_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `phone` VARCHAR(20),
  `email` VARCHAR(100),
  `address` TEXT,
  `balance` DECIMAL(10,2) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `contact_person` VARCHAR(255),
  `phone` VARCHAR(20),
  `email` VARCHAR(100),
  `address` TEXT,
  `balance` DECIMAL(10,2) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `po_no` VARCHAR(20) UNIQUE NOT NULL,
  `supplier_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `discount` DECIMAL(10,2) DEFAULT 0,
  `total` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending','received','cancelled') DEFAULT 'pending',
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_supplier_id` (`supplier_id`),
  INDEX `idx_po_no` (`po_no`),
  CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`),
  CONSTRAINT `fk_po_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);

CREATE TABLE IF NOT EXISTS `purchase_order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `po_id` INT NOT NULL,
  `product_id` INT,
  `product_name` VARCHAR(255),
  `quantity` INT NOT NULL,
  `unit_cost` DECIMAL(10,2) NOT NULL,
  `subtotal` DECIMAL(10,2) NOT NULL,
  INDEX `idx_po_id` (`po_id`),
  INDEX `idx_po_product_id` (`product_id`),
  CONSTRAINT `fk_poi_order` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_poi_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_no` VARCHAR(20) UNIQUE NOT NULL,
  `user_id` INT NOT NULL,
  `customer_id` INT,
  `subtotal` DECIMAL(10,2) NOT NULL,
  `discount` DECIMAL(10,2) DEFAULT 0,
  `tax` DECIMAL(10,2) DEFAULT 0,
  `total` DECIMAL(10,2) NOT NULL,
  `profit` DECIMAL(10,2) DEFAULT 0,
  `payment_method` ENUM('cash','card','transfer','credit') DEFAULT 'cash',
  `amount_tendered` DECIMAL(10,2) DEFAULT 0,
  `change_due` DECIMAL(10,2) DEFAULT 0,
  `status` ENUM('completed','cancelled') DEFAULT 'completed',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_customer_id` (`customer_id`),
  INDEX `idx_invoice_no` (`invoice_no`),
  INDEX `idx_created_at` (`created_at`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `product_id` INT,
  `product_name` VARCHAR(255),
  `quantity` INT NOT NULL,
  `unit_price` DECIMAL(10,2) NOT NULL,
  `unit_cost` DECIMAL(10,2) DEFAULT 0,
  `profit` DECIMAL(10,2) DEFAULT 0,
  `line_discount` DECIMAL(10,2) DEFAULT 0,
  `subtotal` DECIMAL(10,2) NOT NULL,
  INDEX `idx_order_id` (`order_id`),
  INDEX `idx_product_id` (`product_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `customer_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_method` ENUM('cash','card','transfer') DEFAULT 'cash',
  `notes` VARCHAR(255),
  `user_id` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_cp_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cp_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `supplier_payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `supplier_id` INT NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `payment_method` ENUM('cash','card','transfer') DEFAULT 'cash',
  `notes` VARCHAR(255),
  `user_id` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_sp_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sp_user` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `license_blacklist` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `mac_address` VARCHAR(20) NOT NULL,
  `reason` VARCHAR(255),
  `deactivated_by` INT,
  `deactivated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_mac` (`mac_address`),
  CONSTRAINT `fk_blacklist_user` FOREIGN KEY (`deactivated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
);
