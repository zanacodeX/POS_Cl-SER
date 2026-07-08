const mysql = require('mysql2/promise');
const { initDatabase } = require('./init-db');

let pool;

async function getPool() {
  if (!pool) {
    await initDatabase();
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'pos_system',
      port: parseInt(process.env.DB_PORT || '3306'),
      waitForConnections: true,
      connectionLimit: 20,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      dateStrings: true
    });
  }
  return pool;
}

async function query(sql, params) {
  const p = await getPool();
  const [rows] = await p.query(sql, params);
  return rows;
}

async function transaction(callback) {
  const p = await getPool();
  const conn = await p.getConnection();
  await conn.beginTransaction();
  try {
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { query, transaction, getPool };
