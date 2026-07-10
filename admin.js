const path = require('path');

const bypassPath = path.join(__dirname, 'backend', 'services', 'infinityfree-bypass.js');
const { requestWithAntiBotBypass } = require(bypassPath);

const API_URL = process.env.LICENSE_API_URL || 'http://if042362043.infinityfreeapp.com/api';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'posadmin2024';

const cmd = process.argv[2];

async function createKey(company) {
  const r = await requestWithAntiBotBypass(API_URL.replace(/\/+$/, '') + '/admin/create-key.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company, secret: ADMIN_SECRET }),
  });
  const result = JSON.parse(r.body);
  if (result.valid) {
    console.log(`\n  Product Key: ${result.product_key}`);
    console.log(`  Company:     ${result.company}\n`);
  } else {
    console.error('  Error:', result.error);
  }
}

async function deactivateKey(key) {
  console.log(`\n  Deactivating key: ${key}...`);
  const r = await requestWithAntiBotBypass(API_URL.replace(/\/+$/, '') + '/admin/deactivate.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, secret: ADMIN_SECRET }),
  });
  const result = JSON.parse(r.body);
  if (result.valid) {
    console.log(`  ${result.message}\n`);
    if (result.affected_macs?.length > 0) {
      console.log(`  Affected MACs: ${result.affected_macs.join(', ')}`);
    }
  } else {
    console.error('  Error:', result.error);
  }
}

async function listKeys() {
  const r = await requestWithAntiBotBypass(API_URL.replace(/\/+$/, '') + '/admin/list.php?secret=' + ADMIN_SECRET);
  const result = JSON.parse(r.body);
  console.log('\n── Licenses ──');
  for (const l of result.licenses) {
    console.log(`  ${l.product_key}  |  ${l.company_name.padEnd(20)}  |  ${l.status}  |  ${l.created_at}`);
  }
  console.log('\n── Activations ──');
  for (const a of result.activations) {
    console.log(`  ${a.product_key}  |  ${a.mac_address}  |  ${a.activated_at}`);
  }
  if (result.blacklist?.length > 0) {
    console.log('\n── Blacklist ──');
    for (const b of result.blacklist) {
      console.log(`  ${b.mac_address}  |  ${b.reason}  |  ${b.created_at}`);
    }
  }
  console.log();
}

async function reactivateKey(key) {
  console.log(`\n  Reactivating key: ${key}...`);
  const r = await requestWithAntiBotBypass(API_URL.replace(/\/+$/, '') + '/admin/reactivate.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, secret: ADMIN_SECRET }),
  });
  const result = JSON.parse(r.body);
  if (result.valid) {
    console.log(`  ${result.message}\n`);
  } else {
    console.error('  Error:', result.error);
  }
}

async function cleanupKey(key) {
  console.log(`\n  Cleaning up excess activations for: ${key}...`);
  const r = await requestWithAntiBotBypass(API_URL.replace(/\/+$/, '') + '/admin/cleanup.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, secret: ADMIN_SECRET }),
  });
  const result = JSON.parse(r.body);
  if (result.valid) {
    console.log(`  ${result.message}\n`);
  } else {
    console.error('  Error:', result.error);
  }
}

async function deleteKey(key) {
  console.log(`\n  Permanently deleting key: ${key}...`);
  const r = await requestWithAntiBotBypass(API_URL.replace(/\/+$/, '') + '/admin/delete.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, secret: ADMIN_SECRET }),
  });
  const result = JSON.parse(r.body);
  if (result.valid) {
    console.log(`  ${result.message}\n`);
  } else {
    console.error('  Error:', result.error);
  }
}

async function main() {
  switch (cmd) {
    case 'create':
      if (!process.argv[3]) { console.log('Usage: node admin.js create "Company Name"'); return; }
      await createKey(process.argv[3]);
      break;
    case 'deactivate':
      if (!process.argv[3]) { console.log('Usage: node admin.js deactivate PRODUCT_KEY'); return; }
      await deactivateKey(process.argv[3]);
      break;
    case 'reactivate':
      if (!process.argv[3]) { console.log('Usage: node admin.js reactivate PRODUCT_KEY'); return; }
      await reactivateKey(process.argv[3]);
      break;
    case 'cleanup':
      if (!process.argv[3]) { console.log('Usage: node admin.js cleanup PRODUCT_KEY'); return; }
      await cleanupKey(process.argv[3]);
      break;
    case 'delete':
      if (!process.argv[3]) { console.log('Usage: node admin.js delete PRODUCT_KEY'); return; }
      await deleteKey(process.argv[3]);
      break;
    case 'list':
      await listKeys();
      break;
    default:
      console.log('\n  Pixel Art POS — License Admin\n');
      console.log('  Usage:');
      console.log('    node admin.js create "Company Name"     Generate a new product key');
      console.log('    node admin.js list                     List all keys & activations');
      console.log('    node admin.js deactivate KEY           Deactivate a product key');
      console.log('    node admin.js reactivate KEY           Reactivate a deactivated key');
      console.log('    node admin.js cleanup KEY              Remove duplicate activations (keep 1st only)');
      console.log('    node admin.js delete KEY               Permanently delete key from server\n');
  }
}

main().catch(e => console.error('Error:', e.message));
