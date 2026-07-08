/**
 * Pixel Art POS — License Key Generator
 * 
 * Standalone script — copy this file anywhere, no dependencies needed.
 * 
 * Usage:
 *   node generate-license.js <MAC_ADDRESS>
 * 
 * Example:
 *   node generate-license.js AA:BB:CC:DD:EE:FF
 */

const crypto = require('crypto');

const SECRET = 'PIXEL-ART-POS-V2-SECRET-KEY-2026';

function generateLicenseKey(macAddress) {
  const cleanMac = macAddress.trim().toUpperCase().replace(/-/g, ':');
  const fingerprint = crypto.createHash('sha256').update(cleanMac).digest('hex');
  const hmac = crypto.createHmac('sha256', SECRET).update(fingerprint).digest('hex');
  const key = fingerprint.substring(0, 8) + '-' + hmac.substring(0, 8) + '-' + hmac.substring(8, 16) + '-' + hmac.substring(16, 24);
  return key.toUpperCase();
}

const mac = process.argv[2];
if (!mac) {
  console.log('\n  Pixel Art POS — License Key Generator\n');
  console.log('  Usage: node generate-license.js <MAC_ADDRESS>\n');
  console.log('  Example: node generate-license.js AA:BB:CC:DD:EE:FF\n');
  process.exit(1);
}

const key = generateLicenseKey(mac);
console.log(`\n  Product Key for ${mac}:`);
console.log(`  ${key}\n`);
