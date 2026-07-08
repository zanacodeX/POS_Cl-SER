const crypto = require('crypto');
const os = require('os');
const fs = require('fs');
const path = require('path');

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

function getLicenseKey() {
  try {
    const file = getLicensePath();
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
  } catch {}
  return null;
}

module.exports = { getMacAddress, getMachineFingerprint, generateKey, generateLicenseKey, validateLicense, loadLicense, saveLicense, getLicenseStatus, isBlacklisted, getLicenseKey, getLicensePath };
