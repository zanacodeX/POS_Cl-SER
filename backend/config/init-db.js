const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;

  // Connect without database to create it if needed
  const conn = await mysql.createConnection({
    host: DB_HOST || 'localhost',
    user: DB_USER || 'root',
    password: DB_PASSWORD || '',
    port: parseInt(DB_PORT) || 3306,
    multipleStatements: true
  });

  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${DB_NAME}\``);

  // Run schema (IF NOT EXISTS — safe even if tables already exist)
  const schemaPath = path.join(__dirname, '..', 'schema.sql');
  if (fs.existsSync(schemaPath)) {
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await conn.query(schema);
  }

  // Migrate existing tables — add columns that may be missing from older installs
  async function addColumnIfMissing(table, column, definition) {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [DB_NAME, table, column]
    );
    if (rows[0].cnt === 0) {
      await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
    }
  }
  async function modifyEnum(table, column, enumDef) {
    const [rows] = await conn.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [DB_NAME, table, column]
    );
    if (rows.length > 0 && rows[0].COLUMN_TYPE !== enumDef) {
      await conn.query(`ALTER TABLE \`${table}\` MODIFY COLUMN \`${column}\` ${enumDef}`);
    }
  }
  await addColumnIfMissing('products', 'batch_no', "`batch_no` VARCHAR(50) AFTER `category_id`");
  await addColumnIfMissing('products', 'expiry_date', "`expiry_date` DATE AFTER `batch_no`");
  await addColumnIfMissing('products', 'mfg_date', "`mfg_date` DATE AFTER `expiry_date`");
  await addColumnIfMissing('products', 'discount_type', "`discount_type` ENUM('percentage','flat') DEFAULT NULL AFTER `low_stock_threshold`");
  await addColumnIfMissing('products', 'discount_value', "`discount_value` DECIMAL(10,2) DEFAULT 0 AFTER `discount_type`");
  await addColumnIfMissing('products', 'discount_min_qty', "`discount_min_qty` INT DEFAULT 1 AFTER `discount_value`");
  await addColumnIfMissing('products', 'discount_valid_from', "`discount_valid_from` DATE AFTER `discount_min_qty`");
  await addColumnIfMissing('products', 'discount_valid_to', "`discount_valid_to` DATE AFTER `discount_valid_from`");
  await addColumnIfMissing('customers', 'balance', "`balance` DECIMAL(10,2) DEFAULT 0 AFTER `address`");
  await addColumnIfMissing('orders', 'profit', "`profit` DECIMAL(10,2) DEFAULT 0 AFTER `total`");
  await addColumnIfMissing('order_items', 'unit_cost', "`unit_cost` DECIMAL(10,2) DEFAULT 0 AFTER `unit_price`");
  await addColumnIfMissing('order_items', 'profit', "`profit` DECIMAL(10,2) DEFAULT 0 AFTER `unit_cost`");
  await addColumnIfMissing('order_items', 'line_discount', "`line_discount` DECIMAL(10,2) DEFAULT 0 AFTER `profit`");
  await modifyEnum('orders', 'payment_method', "ENUM('cash','card','transfer','credit') DEFAULT 'cash'");
  await addColumnIfMissing('products', 'bundle_qty', "`bundle_qty` INT DEFAULT NULL AFTER `discount_valid_to`");
  await addColumnIfMissing('products', 'bundle_price', "`bundle_price` DECIMAL(10,2) DEFAULT NULL AFTER `bundle_qty`");
  // Ensure product_price_tiers table exists (already in schema.sql with IF NOT EXISTS)

  // Track schema version for one-time cleanups
  await conn.query(
    `CREATE TABLE IF NOT EXISTS db_version (id INT PRIMARY KEY, version INT NOT NULL)`
  );
  const [verRows] = await conn.query('SELECT version FROM db_version WHERE id = 1');
  const currentVersion = verRows.length > 0 ? verRows[0].version : 0;

  if (currentVersion < 2) {
    // Clear old seed data only (categories/products from previous seed.js)
    await conn.query('DELETE FROM product_price_tiers');
    await conn.query('DELETE FROM products');
    await conn.query('DELETE FROM categories');
    await conn.query('DELETE FROM customers');
    await conn.query(
      `INSERT INTO db_version (id, version) VALUES (1, 2) ON DUPLICATE KEY UPDATE version = 2`
    );
  }

  // Seed default users
  const hash = await bcrypt.hash('admin123', 10);
  await conn.query(
    `INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id`,
    ['admin', hash, 'Administrator', 'admin']
  );
  const hash2 = await bcrypt.hash('cashier123', 10);
  await conn.query(
    `INSERT INTO users (username, password_hash, full_name, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE id=id`,
    ['cashier', hash2, 'Cashier', 'cashier']
  );

  await conn.end();
  return { created: true };
}

module.exports = { initDatabase };
