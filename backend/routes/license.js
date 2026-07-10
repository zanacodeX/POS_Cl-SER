const express = require('express');
const router = express.Router();
const { getLicenseStatus, saveLicense, validateLicense, getMacAddress, isBlacklisted, getLicenseKey, registerProductKey } = require('../services/license');
const { verifyToken } = require('../middleware/auth');

router.get('/status', async (req, res) => {
  if (process.env.SKIP_LICENSE === 'true') {
    return res.json({ licensed: true, mac: getMacAddress(), path: null, key: null, blacklisted: false, deactivated: false });
  }
  const status = getLicenseStatus();
  const key = getLicenseKey();
  const blacklisted = await isBlacklisted(status.mac);
  // Also check online deactivation status
  let deactivated = false;
  if (key) {
    try {
      process.env.PRODUCT_KEY = key;
      const { onlineValidate } = require('../services/license');
      await onlineValidate();
    } catch (e) {
      if (e.message.includes('deactivated')) deactivated = true;
    }
  }
  res.json({ ...status, key, blacklisted, deactivated });
});

router.post('/activate', verifyToken, async (req, res) => {
  const { key } = req.body;
  if (!key) return res.status(400).json({ error: 'Product key is required.' });
  if (!validateLicense(key)) return res.status(400).json({ error: 'Invalid product key format.' });
  try {
    await registerProductKey(key);
    saveLicense(key);
    process.env.PRODUCT_KEY = key;
    return res.json({ success: true, message: 'License activated successfully.' });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

router.get('/fingerprint', verifyToken, (req, res) => {
  res.json({ fingerprint: getLicenseStatus().fingerprint });
});

module.exports = router;
