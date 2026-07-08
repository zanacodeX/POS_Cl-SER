const { loadLicense, getMacAddress, isBlacklisted } = require('../services/license');

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
  next();
}

module.exports = { requireLicense };
