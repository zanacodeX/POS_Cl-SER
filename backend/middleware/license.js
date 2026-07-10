const { loadLicense, getMacAddress, isBlacklisted, onlineValidate, getLicenseKey } = require('../services/license');

let onlineCheckCache = { timestamp: 0, blacklisted: false };

async function checkOnlineBlacklist() {
  const key = getLicenseKey() || process.env.PRODUCT_KEY;
  if (!key) return false;
  if (Date.now() - onlineCheckCache.timestamp < 60000) return onlineCheckCache.blacklisted;
  try {
    process.env.PRODUCT_KEY = key;
    const result = await onlineValidate();
    onlineCheckCache = { timestamp: Date.now(), blacklisted: false };
    return false;
  } catch (err) {
    const msg = err.message;
    if (msg.includes('deactivated') || msg.includes('blacklisted')) {
      onlineCheckCache = { timestamp: Date.now(), blacklisted: true };
      return true;
    }
    onlineCheckCache = { timestamp: Date.now(), blacklisted: false };
    return false;
  }
}

async function requireLicense(req, res, next) {
  if (process.env.SKIP_LICENSE === 'true') return next();
  const excludedPaths = ['/api/license', '/api/auth/login'];
  if (excludedPaths.some(p => req.originalUrl.startsWith(p))) return next();
  if (!loadLicense()) {
    return res.status(403).json({ error: 'License required. Please activate the software with a valid product key.', code: 'LICENSE_REQUIRED' });
  }
  const mac = getMacAddress();
  const blacklisted = await isBlacklisted(mac);
  if (blacklisted) {
    return res.status(403).json({ error: 'This license has been deactivated. Contact support.', code: 'LICENSE_DEACTIVATED' });
  }
  const onlineBlacklisted = await checkOnlineBlacklist();
  if (onlineBlacklisted) {
    return res.status(403).json({ error: 'This license has been deactivated. Contact support.', code: 'LICENSE_DEACTIVATED' });
  }
  next();
}

module.exports = { requireLicense };
