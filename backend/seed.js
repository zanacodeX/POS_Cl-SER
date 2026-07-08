const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');

async function seed() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pos_system',
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });

  try {
    console.log('Running schema.sql...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    const statements = schema.split(';').filter(s => s.trim().length > 0);
    for (const stmt of statements) {
      await pool.query(stmt);
    }
    console.log('Tables created successfully.');

    const [existingUsers] = await pool.query('SELECT COUNT(*) AS count FROM users');
    if (existingUsers[0].count > 0) {
      console.log('Data already seeded. Skipping.');
      await pool.end();
      return;
    }

    const adminHash = await bcrypt.hash('admin123', 10);
    const cashierHash = await bcrypt.hash('cashier123', 10);

    await pool.query(
      'INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)',
      ['admin', adminHash, 'admin', 'Administrator']
    );
    await pool.query(
      'INSERT INTO users (username, password_hash, role, full_name) VALUES (?, ?, ?, ?)',
      ['cashier', cashierHash, 'cashier', 'Cashier']
    );
    console.log('Default users created.');

    const categories = ['T-Shirts', 'Mugs', 'Stickers', 'Posters', 'Others'];
    for (const cat of categories) {
      await pool.query('INSERT INTO categories (name) VALUES (?)', [cat]);
    }
    console.log('Categories created.');

    const [catRows] = await pool.query('SELECT id, name FROM categories');
    const catMap = {};
    for (const r of catRows) {
      catMap[r.name] = r.id;
    }

    const products = [
      { barcode: '100001', name: 'Pixel Art T-Shirt - Black', category: 'T-Shirts', price: 599, cost: 350, quantity: 50, threshold: 5 },
      { barcode: '100002', name: 'Pixel Art T-Shirt - White', category: 'T-Shirts', price: 599, cost: 350, quantity: 45, threshold: 5 },
      { barcode: '100003', name: 'Retro Gaming Mug', category: 'Mugs', price: 349, cost: 180, quantity: 30, threshold: 5 },
      { barcode: '100004', name: 'Pixel Coffee Mug', category: 'Mugs', price: 399, cost: 200, quantity: 25, threshold: 5 },
      { barcode: '100005', name: '8-Bit Heart Sticker', category: 'Stickers', price: 49, cost: 15, quantity: 200, threshold: 20 },
      { barcode: '100006', name: 'Pixel Cat Sticker Pack', category: 'Stickers', price: 99, cost: 35, quantity: 150, threshold: 20 },
      { barcode: '100007', name: 'Mountain Landscape Poster', category: 'Posters', price: 249, cost: 120, quantity: 20, threshold: 5 },
      { barcode: '100008', name: 'City Skyline Poster', category: 'Posters', price: 299, cost: 140, quantity: 15, threshold: 5 },
      { barcode: '100009', name: 'Pixel Keychain', category: 'Others', price: 149, cost: 70, quantity: 100, threshold: 10 },
      { barcode: '100010', name: 'Canvas Tote Bag', category: 'Others', price: 449, cost: 250, quantity: 35, threshold: 5 }
    ];

    for (const p of products) {
      await pool.query(
        'INSERT INTO products (barcode, name, category_id, price, cost, quantity, low_stock_threshold) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [p.barcode, p.name, catMap[p.category], p.price, p.cost, p.quantity, p.threshold]
      );
    }
    console.log('Sample products created.');

    await pool.query(
      'INSERT INTO customers (name, phone, email, address) VALUES (?, ?, ?, ?)',
      ['Walk-in Customer', '0000000000', '', 'Counter']
    );
    console.log('Sample customer created.');

    try {
      const { saveLicense, generateKey } = require('./services/license');
      saveLicense(generateKey());
      console.log('  License:    Auto-generated for this machine');
    } catch {}

    console.log('\nSeed completed successfully!');
    console.log('Admin login:   username=admin   password=admin123');
    console.log('Cashier login: username=cashier password=cashier123');
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
