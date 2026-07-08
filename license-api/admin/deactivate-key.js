// Run: node admin/deactivate-key.js PRODUCT_KEY
// Deactivates a product key on the license server

const https = require('https');
const http = require('http');

const API_URL = process.env.LICENSE_API_URL || 'http://localhost/api';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'posadmin2024';

const key = process.argv[2];
if (!key) {
  console.error('Usage: node admin/deactivate-key.js PRODUCT_KEY');
  process.exit(1);
}

console.log(`\n  Deactivating key: ${key}...`);

const data = JSON.stringify({ key, secret: ADMIN_SECRET });
const url = new URL(API_URL.replace(/\/+$/, '') + '/admin/deactivate.php');
const client = url.protocol === 'https:' ? https : http;

const req = client.request({
  hostname: url.hostname,
  port: url.port || (url.protocol === 'https:' ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    const result = JSON.parse(body);
    if (result.valid) {
      console.log(`  ✓ ${result.message}\n`);
      if (result.affected_macs && result.affected_macs.length > 0) {
        console.log(`  Affected MACs: ${result.affected_macs.join(', ')}`);
      }
    } else {
      console.error('  ✗ Error:', result.error);
    }
  });
});

req.on('error', (e) => console.error('  ✗ Connection error:', e.message));
req.write(data);
req.end();
