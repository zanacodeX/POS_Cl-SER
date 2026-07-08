// Run: node admin/generate-key.js "Company Name"
// Creates a new product key on the license server

const https = require('https');
const http = require('http');

const API_URL = process.env.LICENSE_API_URL || 'http://localhost/api';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'posadmin2024';

const company = process.argv[2];
if (!company) {
  console.error('Usage: node admin/generate-key.js "Company Name"');
  process.exit(1);
}

const data = JSON.stringify({ company, secret: ADMIN_SECRET });
const url = new URL(API_URL.replace(/\/+$/, '') + '/admin/create-key.php');
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
      console.log(`\n  Product Key: ${result.product_key}`);
      console.log(`  Company:     ${result.company}\n`);
    } else {
      console.error('Error:', result.error);
    }
  });
});

req.on('error', (e) => console.error('Connection error:', e.message));
req.write(data);
req.end();
