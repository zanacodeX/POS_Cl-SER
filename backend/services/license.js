const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

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
    const expectedKey = generateKey();
    return key.replace(/-/g, '').toUpperCase() === expectedKey.replace(/-/g, '').toUpperCase();
  } catch {
    return false;
  }
}

function loadLicense() {
  try {
    const file = getLicensePath();
    if (fs.existsSync(file)) {
      const key = fs.readFileSync(file, 'utf8').trim();
      return validateLicense(key);
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
  const productKey = process.env.PRODUCT_KEY;
  const apiUrl = process.env.LICENSE_API_URL || 'http://localhost/api';

  if (!productKey) {
    throw new Error('PRODUCT_KEY not set in .env');
  }

  const mac = getMacAddress();

  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ key: productKey, mac });
    const url = new URL(apiUrl.replace(/\/+$/, '') + '/validate.php');

    const client = url.protocol === 'https:' ? https : http;
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 10000
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.valid) {
            resolve(result);
          } else {
            reject(new Error(result.error || 'License validation failed'));
          }
        } catch {
          reject(new Error('Invalid response from license server'));
        }
      });
    });

    req.on('error', () => reject(new Error('Cannot reach license server (check internet)')));
    req.on('timeout', () => { req.destroy(); reject(new Error('License server timeout')); });
    req.write(data);
    req.end();
  });
}

function getLicenseKey() {
  try {
    const file = getLicensePath();
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  } catch {}
  return null;
}

module.exports = { getMacAddress, getMachineFingerprint, generateKey, generateLicenseKey, validateLicense, loadLicense, saveLicense, getLicenseStatus, isBlacklisted, getLicenseKey, getLicensePath, onlineValidate };
