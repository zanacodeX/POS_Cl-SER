/**
 * Development setup — generates a license for the current machine
 * Run: node dev-setup.js
 */
const { saveLicense, generateKey } = require('./backend/services/license');

const key = generateKey();
saveLicense(key);
console.log('License generated and saved for this machine.');
