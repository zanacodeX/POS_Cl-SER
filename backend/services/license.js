const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { requestWithAntiBotBypass } = require('./infinityfree-bypass');

const SECRET = 'PIXEL-ART-POS-V2-SECRET-KEY-2026';

function getLicensePath() {
  if (process.env.LICENSE_PATH) return process.env.LICENSE_PATH;
  const appData = process.env.APPDATA;
  if (appData) {
    const dir = path.join(appData, 'Pixel Art POS Server');
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    return path.join(dir, 'license.key');
  }
  return path.join(__dirname, '..', 'license.key');
}

function getMacAddress() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.mac.toUpperCase();
      }
    }
  }
  return '00-00-00-00-00-00';
}

function getMachineFingerprint() {
  return crypto.createHash('sha256').update(getMacAddress()).digest('hex');
}

function generateKey() {
  const fingerprint = getMachineFingerprint();
  const hmac = crypto.createHmac('sha256', SECRET).update(fingerprint).digest('hex');
  const key = fingerprint.substring(0, 8) + '-' + hmac.substring(0, 8) + '-' + hmac.substring(8, 16) + '-' + hmac.substring(16, 24);
  return key.toUpperCase();
}

function generateLicenseKey(macAddress) {
  const cleanMac = macAddress.trim().toUpperCase().replace(/-/g, ':');
  const fingerprint = crypto.createHash('sha256').update(cleanMac).digest('hex');
  const hmac = crypto.createHmac('sha256', SECRET).update(fingerprint).digest('hex');
  const key = fingerprint.substring(0, 8) + '-' + hmac.substring(0, 8) + '-' + hmac.substring(8, 16) + '-' + hmac.substring(16, 24);
  return key.toUpperCase();
}

function validateLicense(key) {
  try {
    return /^[A-Z0-9]{3,}(-[A-Z0-9]{4,}){1,}$/.test(key.trim().toUpperCase());
  } catch {
    return false;
  }
}

function loadLicense() {
  try {
    const file = getLicensePath();
    if (fs.existsSync(file)) {
      const key = fs.readFileSync(file, 'utf8').trim();
      return key.length > 0;
    }
  } catch {}
  return false;
}

function saveLicense(key) {
  try {
    fs.writeFileSync(getLicensePath(), key, 'utf8');
    return true;
  } catch {
    return false;
  }
}

function getLicenseStatus() {
  return {
    licensed: loadLicense(),
    mac: getMacAddress(),
    path: getLicensePath()
  };
}

async function isBlacklisted(mac) {
  try {
    const { query } = require('../config/db');
    const rows = await query('SELECT id FROM license_blacklist WHERE mac_address = ?', [mac]);
    return rows.length > 0;
  } catch { return false; }
}

async function onlineValidate() {
  let productKey = process.env.PRODUCT_KEY;

  if (!productKey) {
    productKey = getLicenseKey();
    if (productKey) {
      process.env.PRODUCT_KEY = productKey;
    }
  }

  const apiUrl = process.env.LICENSE_API_URL || 'http://localhost/api';

  if (!productKey) {
    throw new Error('PRODUCT_KEY_NOT_SET');
  }

  const mac = getMacAddress();
  const data = JSON.stringify({ key: productKey, mac });
  const validateUrl = apiUrl.replace(/\/+$/, '') + '/validate.php';

  const res = await requestWithAntiBotBypass(validateUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  });

  try {
    const result = JSON.parse(res.body);
    if (result.valid) return result;
    throw new Error(result.error || 'License validation failed');
  } catch (e) {
    if (['License validation failed', 'Invalid product key', 'Product key has been deactivated',
         'License has been deactivated', 'Not authorized'].includes(e.message)) throw e;
    throw new Error('Invalid response from license server');
  }
}

function getLicenseKey() {
  try {
    const file = getLicensePath();
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  } catch {}
  return null;
}

async function registerProductKey(productKey) {
  const apiUrl = process.env.LICENSE_API_URL || 'http://localhost/api';
  const mac = getMacAddress();
  const data = JSON.stringify({ key: productKey, mac });
  const registerUrl = apiUrl.replace(/\/+$/, '') + '/register.php';

  const res = await requestWithAntiBotBypass(registerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: data,
  });

  try {
    const result = JSON.parse(res.body);
    if (result.valid || result.message === 'Already registered') return result;
    throw new Error(result.error || 'Registration failed');
  } catch (e) {
    if (['Registration failed', 'Invalid product key', 'Already registered', 'This server is already registered with a different key'].includes(e.message)) throw e;
    throw new Error('Invalid response from license server');
  }
}

async function promptProductKey() {
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  return new Promise((resolve) => {
    console.log('\n╔══════════════════════════════════════════════╗');
    console.log('║     PIXEL ART POS — License Activation      ║');
    console.log('╠══════════════════════════════════════════════╣');
    console.log('║  No product key found.                       ║');
    console.log('║  Enter the key provided by your vendor       ║');
    console.log('║  to activate this server.                    ║');
    console.log('╚══════════════════════════════════════════════╝\n');
    rl.question('  Product Key: ', (answer) => {
      rl.close();
      resolve(answer.trim().toUpperCase());
    });
  });
}

module.exports = { getMacAddress, getMachineFingerprint, generateKey, generateLicenseKey, validateLicense, loadLicense, saveLicense, getLicenseStatus, isBlacklisted, getLicenseKey, getLicensePath, onlineValidate, registerProductKey, promptProductKey };
