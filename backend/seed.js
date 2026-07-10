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
      console.log('Users already exist. Skipping seed.');
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
