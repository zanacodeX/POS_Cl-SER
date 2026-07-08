/**
 * Standalone License Deactivation Tool
 * Usage:
 *   node deactivate-license.js <MAC> [reason]        Deactivate a MAC
 *   node deactivate-license.js --reactivate <MAC>     Reactivate a MAC
 *   node deactivate-license.js --list                 List blacklisted MACs
 *
 * Uses .env for DB config, or set env vars directly:
 *   DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Try to load .env from backend folder
const envPath = path.join(__dirname, 'backend', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.substring(0, eqIdx).trim();
    const val = trimmed.substring(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val.replace(/^['"]|['"]$/g, '');
  }
}

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'pos_system';
const DB_PORT = parseInt(process.env.DB_PORT || '3306');

function usage() {
  console.log(`
Usage:
  node deactivate-license.js <MAC> [reason]        Deactivate a MAC address
  node deactivate-license.js --reactivate <MAC>     Reactivate a MAC address
  node deactivate-license.js --list                 List all blacklisted MACs
  node deactivate-license.js --help                 Show this help

Examples:
  node deactivate-license.js 14:85:7F:65:E2:71 "Stolen device"
  node deactivate-license.js --reactivate 14:85:7F:65:E2:71
  node deactivate-license.js --list
`);
  process.exit(0);
}

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === '--help') usage();

async function main() {
  let mysql;
  try {
    mysql = require('mysql2/promise');
  } catch {
    console.error('ERROR: mysql2 is required. Run: npm install mysql2');
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: DB_HOST, user: DB_USER, password: DB_PASSWORD,
    database: DB_NAME, port: DB_PORT
  });

  // Auto-create blacklist table if missing (works with existing databases)
  await conn.query(
    `CREATE TABLE IF NOT EXISTS license_blacklist (
      id INT AUTO_INCREMENT PRIMARY KEY,
      mac_address VARCHAR(20) NOT NULL,
      reason VARCHAR(255),
      deactivated_by INT,
      deactivated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_mac (mac_address)
    )`
  );

  if (args[0] === '--list') {
    const [rows] = await conn.query(
      `SELECT lb.mac_address, lb.reason, lb.deactivated_at
       FROM license_blacklist lb
       ORDER BY lb.deactivated_at DESC`
    );
    if (rows.length === 0) {
      console.log('No blacklisted licenses.');
    } else {
      console.log('\nBlacklisted Licenses:');
      console.log('─'.repeat(70));
      for (const r of rows) {
        console.log(`  MAC:      ${r.mac_address}`);
        console.log(`  Reason:   ${r.reason || '-'}`);
        console.log(`  Date:     ${r.deactivated_at}`);
        console.log('─'.repeat(70));
      }
    }
    await conn.end();
    return;
  }

  if (args[0] === '--reactivate') {
    const mac = args[1];
    if (!mac) { console.log('ERROR: Provide a MAC address to reactivate.'); usage(); }
    const cleanMac = mac.trim().toUpperCase().replace(/-/g, ':');
    await conn.query('DELETE FROM license_blacklist WHERE mac_address = ?', [cleanMac]);
    console.log(`MAC ${cleanMac} reactivated.`);
    await conn.end();
    return;
  }

  // Default: deactivate
  const mac = args[0];
  const reason = args.slice(1).join(' ').trim() || null;
  const cleanMac = mac.trim().toUpperCase().replace(/-/g, ':');

  await conn.query(
    `INSERT INTO license_blacklist (mac_address, reason, deactivated_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE reason=VALUES(reason), deactivated_at=NOW()`,
    [cleanMac, reason]
  );

  // Also try to delete the license file on this machine if it matches
  try {
    const licensePath = path.join(__dirname, 'license.key');
    if (fs.existsSync(licensePath)) {
      const storedKey = fs.readFileSync(licensePath, 'utf8').trim();
      // Check if stored key matches this MAC — simple heuristic
      const fingerprint = crypto.createHash('sha256').update(cleanMac).digest('hex');
      if (storedKey.startsWith(fingerprint.substring(0, 8))) {
        fs.unlinkSync(licensePath);
        console.log('License file deleted (matches this machine).');
      }
    }
  } catch {}

  console.log(`MAC ${cleanMac} deactivated.`);
  if (reason) console.log(`Reason: ${reason}`);
  await conn.end();
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
