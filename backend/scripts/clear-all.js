require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pos_system',
    port: parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true
  });
  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  const tables = [
    'purchase_order_items',
    'purchase_orders',
    'order_items',
    'orders',
    'customer_payments',
    'supplier_payments',
    'product_price_tiers',
    'products',
    'customers',
    'suppliers',
    'categories',
    'license_blacklist'
  ];
  for (const t of tables) {
    await conn.query('DELETE FROM `' + t + '`');
    await conn.query('ALTER TABLE `' + t + '` AUTO_INCREMENT = 1');
    console.log('Cleared: ' + t);
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');
  await conn.end();
  console.log('Done. Only users table kept.');
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
