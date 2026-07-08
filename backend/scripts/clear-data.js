const { query } = require('../config/db');

async function clearData() {
  const keepTables = ['users', 'license_blacklist'];
  const tables = [
    'product_price_tiers',
    'order_items',
    'orders',
    'purchase_order_items',
    'purchase_orders',
    'supplier_payments',
    'suppliers',
    'customer_payments',
    'customers',
    'products',
    'categories',
  ];

  try {
    await query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of tables) {
      await query(`DELETE FROM \`${table}\``);
      await query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
      console.log(`  ✓ Cleared ${table}`);
    }
    await query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\nDone. All data cleared (users preserved).');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

clearData();
