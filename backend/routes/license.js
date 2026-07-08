const express = require('express');
const router = express.Router();
const { getLicenseStatus, saveLicense, validateLicense, getMacAddress, isBlacklisted, getLicenseKey } = require('../services/license');
const { verifyToken } = require('../middleware/auth');

router.get('/status', async (req, res) => {
  const status = getLicenseStatus();
  const key = getLicenseKey();
  const blacklisted = await isBlacklisted(status.mac);
  res.json({ ...status, key, blacklisted });
});

router.post('/activate', verifyToken, async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'Product key is required.' });
  if (validateLicense(key)) {
    const mac = getMacAddress();
    const blacklisted = await isBlacklisted(mac);
    if (blacklisted) return res.status(403).json({ error: 'This machine is deactivated. Contact support.' });
    saveLicense(key);
    return res.json({ success: true, message: 'License activated successfully.' });
  }
  res.status(400).json({ error: 'Invalid product key for this machine.' });
});

router.get('/fingerprint', verifyToken, (req, res) => {
  res.json({ fingerprint: getLicenseStatus().fingerprint });
});

module.exports = router;
