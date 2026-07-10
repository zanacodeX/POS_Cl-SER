const http = require('http');

const API_URL = 'http://if042362043.infinityfreeapp.com/api';
const ADMIN_SECRET = 'posadmin2024';

const sbox = [99, 124, 119, 123, 242, 107, 111, 197, 48, 1, 103, 43, 254, 215, 171, 118, 202, 130, 201, 125, 250, 89, 71, 240, 173, 212, 162, 175, 156, 164, 114, 192, 183, 253, 147, 38, 54, 63, 247, 204, 52, 165, 229, 241, 113, 216, 49, 21, 4, 199, 35, 195, 24, 150, 5, 154, 7, 18, 128, 226, 235, 39, 178, 117, 9, 131, 44, 26, 27, 110, 90, 160, 82, 59, 214, 179, 41, 227, 47, 132, 83, 209, 0, 237, 32, 252, 177, 91, 106, 203, 190, 57, 74, 76, 88, 207, 208, 239, 170, 251, 67, 77, 51, 133, 69, 249, 2, 127, 80, 60, 159, 168, 81, 163, 64, 143, 146, 157, 56, 245, 188, 182, 218, 33, 16, 255, 243, 210, 205, 12, 19, 236, 95, 151, 68, 23, 196, 167, 126, 61, 100, 93, 25, 115, 96, 129, 79, 220, 34, 42, 144, 136, 70, 238, 184, 20, 222, 94, 11, 219, 224, 50, 58, 10, 73, 6, 36, 92, 194, 211, 172, 98, 145, 149, 228, 121, 231, 200, 55, 109, 141, 213, 78, 169, 108, 86, 244, 234, 101, 122, 174, 8, 186, 120, 37, 46, 28, 166, 180, 198, 232, 221, 116, 31, 75, 189, 139, 138, 112, 62, 181, 102, 72, 3, 246, 14, 97, 53, 87, 185, 134, 193, 29, 158, 225, 248, 152, 17, 105, 217, 142, 148, 155, 30, 135, 233, 206, 85, 40, 223, 140, 161, 137, 13, 191, 230, 66, 104, 65, 153, 45, 15, 176, 84, 187, 22];
const rsbox = [82, 9, 106, 213, 48, 54, 165, 56, 191, 64, 163, 158, 129, 243, 215, 251, 124, 227, 57, 130, 155, 47, 255, 135, 52, 142, 67, 68, 196, 222, 233, 203, 84, 123, 148, 50, 166, 194, 35, 61, 238, 76, 149, 11, 66, 250, 195, 78, 8, 46, 161, 102, 40, 217, 36, 178, 118, 91, 162, 73, 109, 139, 209, 37, 114, 248, 246, 100, 134, 104, 152, 22, 212, 164, 92, 204, 93, 101, 182, 146, 108, 112, 72, 80, 253, 237, 185, 218, 94, 21, 70, 87, 167, 141, 157, 132, 144, 216, 171, 0, 140, 188, 211, 10, 247, 228, 88, 5, 184, 179, 69, 6, 208, 44, 30, 143, 202, 63, 15, 2, 193, 175, 189, 3, 1, 19, 138, 107, 58, 145, 17, 65, 79, 103, 220, 234, 151, 242, 207, 206, 240, 180, 230, 115, 150, 172, 116, 34, 231, 173, 53, 133, 226, 249, 55, 232, 28, 117, 223, 110, 71, 241, 26, 113, 29, 41, 197, 137, 111, 183, 98, 14, 170, 24, 190, 27, 252, 86, 62, 75, 198, 210, 121, 32, 154, 219, 192, 254, 120, 205, 90, 244, 31, 221, 168, 51, 136, 7, 199, 49, 177, 18, 16, 89, 39, 128, 236, 95, 96, 81, 127, 169, 25, 181, 74, 13, 45, 229, 122, 159, 147, 201, 156, 239, 160, 224, 59, 77, 174, 42, 245, 176, 200, 235, 187, 60, 131, 83, 153, 97, 23, 43, 4, 126, 186, 119, 214, 38, 225, 105, 20, 99, 85, 33, 12, 125];
const Rcon = [141, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54, 108, 216, 171, 77, 154, 47, 94, 188, 99, 198, 151, 53, 106, 212, 179, 125, 250, 239, 197, 145, 57, 114, 228, 211, 189, 97, 194, 159, 37, 74, 148, 51, 102, 204, 131, 29, 58, 116, 232, 203, 141, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54, 108, 216, 171, 77, 154, 47, 94, 188, 99, 198, 151, 53, 106, 212, 179, 125, 250, 239, 197, 145, 57, 114, 228, 211, 189, 97, 194, 159, 37, 74, 148, 51, 102, 204, 131, 29, 58, 116, 232, 203];

function toNumbers(d) { const e = []; d.replace(/(..)/g, (d) => { e.push(parseInt(d, 16)); }); return e; }
function toHex(d) { let e = ''; for (let f = 0; f < d.length; f++) e += (16 > d[f] ? '0' : '') + d[f].toString(16); return e.toLowerCase(); }
function numberOfRounds(i) { if (i === 16) return 10; if (i === 24) return 12; if (i === 32) return 14; return null; }
function expandKey(i, t) { for (var r = 16 * (numberOfRounds(t) + 1), o = 0, n = 1, s = [], e = [], a = 0; a < r; a++) e[a] = 0; for (var h = 0; h < t; h++) e[h] = i[h]; for (o += t; o < r;) { for (var u = 0; u < 4; u++) s[u] = e[o - 4 + u]; if (o % t === 0 && (s = core(s, n++)), t === 32 && o % t === 16) for (var f = 0; f < 4; f++) s[f] = sbox[s[f]]; for (var l = 0; l < 4; l++) e[o] = e[o - t] ^ s[l], o++; } return e; }
function rotate(i) { for (var t = i[0], r = 0; r < 3; r++) i[r] = i[r + 1]; return i[3] = t, i; }
function core(i, t) { i = rotate(i); for (var r = 0; r < 4; ++r) i[r] = sbox[i[r]]; return i[0] = i[0] ^ Rcon[t], i; }
function addRoundKey(i, t) { for (var r = 0; r < 16; r++) i[r] ^= t[r]; return i; }
function createRoundKey(i, t) { for (var r = [], o = 0; o < 4; o++) for (var n = 0; n < 4; n++) r[4 * n + o] = i[t + 4 * o + n]; return r; }
function subBytes(i, t) { for (var r = 0; r < 16; r++) i[r] = (t ? rsbox : sbox)[i[r]]; return i; }
function shiftRows(i, t) { for (var r = 0; r < 4; r++) i = shiftRow(i, 4 * r, r, t); return i; }
function shiftRow(i, t, r, o) { for (var n = 0; n < r; n++) if (o) { for (var s = i[t + 3], e = 3; 0 < e; e--) i[t + e] = i[t + e - 1]; i[t] = s } else { for (s = i[t], e = 0; e < 3; e++) i[t + e] = i[t + e + 1]; i[t + 3] = s } return i; }
function galois_multiplication(i, t) { for (var r = 0, o = 0; o < 8; o++) { 1 == (1 & t) && (r ^= i), 256 < r && (r ^= 256); var n = 128 & i; 256 < (i <<= 1) && (i ^= 256), 128 == n && (i ^= 27), 256 < i && (i ^= 256), 256 < (t >>= 1) && (t ^= 256) } return r; }
function mixColumns(i, t) { for (var r = [], o = 0; o < 4; o++) { for (var n = 0; n < 4; n++) r[n] = i[4 * n + o]; r = mixColumn(r, t); for (var s = 0; s < 4; s++) i[4 * s + o] = r[s] } return i; }
function mixColumn(i, t) { var r = t ? [14, 9, 13, 11] : [2, 1, 1, 3]; var o = []; for (var n = 0; n < 4; n++) o[n] = i[n]; i[0] = galois_multiplication(o[0], r[0]) ^ galois_multiplication(o[3], r[1]) ^ galois_multiplication(o[2], r[2]) ^ galois_multiplication(o[1], r[3]); i[1] = galois_multiplication(o[1], r[0]) ^ galois_multiplication(o[0], r[1]) ^ galois_multiplication(o[3], r[2]) ^ galois_multiplication(o[2], r[3]); i[2] = galois_multiplication(o[2], r[0]) ^ galois_multiplication(o[1], r[1]) ^ galois_multiplication(o[0], r[2]) ^ galois_multiplication(o[3], r[3]); i[3] = galois_multiplication(o[3], r[0]) ^ galois_multiplication(o[2], r[1]) ^ galois_multiplication(o[1], r[2]) ^ galois_multiplication(o[0], r[3]); return i; }
function round(i, t) { return i = subBytes(i, 0), i = shiftRows(i, 0), i = mixColumns(i, 0), i = addRoundKey(i, t); }
function invRound(i, t) { return i = shiftRows(i, 1), i = subBytes(i, 1), i = addRoundKey(i, t), i = mixColumns(i, 1); }
function main(i, t, r) { i = addRoundKey(i, createRoundKey(t, 0)); for (var o = 1; o < r; o++) i = round(i, createRoundKey(t, 16 * o)); return i = subBytes(i, 0), i = shiftRows(i, 0), i = addRoundKey(i, createRoundKey(t, 16 * r)); }
function invMain(i, t, r) { i = addRoundKey(i, createRoundKey(t, 16 * r)); for (var o = r - 1; 0 < o; o--) i = invRound(i, createRoundKey(t, 16 * o)); return i = shiftRows(i, 1), i = subBytes(i, 1), i = addRoundKey(i, createRoundKey(t, 0)); }
function aes_decrypt(i, t, r) { for (var o = [], n = [], s = numberOfRounds(r), e = 0; e < 4; e++) for (var a = 0; a < 4; a++) n[e + 4 * a] = i[4 * e + a]; r = expandKey(t, r); n = invMain(n, r, s); for (e = 0; e < 4; e++) for (a = 0; a < 4; a++) o[4 * e + a] = n[e + 4 * a]; return o; }
function getBlock(i, t, r) { return 16 < r - t && (r = t + 16), i.slice(t, r); }
function unpadBytesOut(i) { var t = 0, r = -1; if (16 < i.length) { for (var o = i.length - 1; o >= i.length - 1 - 16 && i[o] <= 16; o--) { if (-1 == r && (r = i[o]), i[o] != r) { t = 0; break } if (++t == r) break } 0 < t && i.splice(i.length - t, t) } }
function slowaesDecrypt(t, o, n) { var s = o.length, e, a = [], h = [], u = [], f = [], l = !0; if (null !== t) { for (var c = 0; c < Math.ceil(t.length / 16); c++) { var d = 16 * c, p = 16 * c + 16; if (16 * c + 16 > t.length && (p = t.length), e = getBlock(t, d, p), 2 == 2) { for (h = aes_decrypt(e, o, s), i = 0; i < 16; i++) u[i] = (l ? n : a)[i] ^ h[i]; l = !1; for (v = 0; v < p - d; v++) f.push(u[v]); a = e; } } } 2 == 2 && unpadBytesOut(f); return f; }
function computeCookie(aHex, bHex, cHex) { return toHex(slowaesDecrypt(toNumbers(cHex), toNumbers(aHex), toNumbers(bHex))); }

let cookieCache = { cookie: null, expires: 0 };

function makeRequest(hostname, port, path, method, headers, body) {
  return new Promise((resolve, reject) => {
    const options = { hostname, port, path, method, headers, timeout: 20000 };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

async function getCookie() {
  if (cookieCache.expires > Date.now()) return cookieCache.cookie;
  const url = new URL(API_URL + '/setup.php');
  const res = await makeRequest(url.hostname, url.port || 80, url.pathname, 'GET', { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' });
  const parts = res.body.match(/toNumbers\("([^"]+)"\)/g);
  if (parts && parts.length >= 3) {
    const a = parts[0].match(/toNumbers\("([^"]+)"\)/)[1];
    const b = parts[1].match(/toNumbers\("([^"]+)"\)/)[1];
    const c = parts[2].match(/toNumbers\("([^"]+)"\)/)[1];
    cookieCache.cookie = computeCookie(a, b, c);
    cookieCache.expires = Date.now() + 21600000;
    return cookieCache.cookie;
  }
}

async function apiRequest(path, options = {}) {
  const url = new URL(API_URL.replace(/\/+$/, '') + path);
  const cookie = await getCookie();
  const headers = { ...(options.headers || {}), 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' };
  if (cookie) headers['Cookie'] = '__test=' + cookie;
  const body = options.body || null;
  const res = await makeRequest(url.hostname, url.port || 80, url.pathname + (url.search || ''), options.method || 'GET', headers, body);
  if (res.statusCode === 400 && res.body.includes('openresty')) {
    cookieCache.expires = 0;
    const fresh = await getCookie();
    if (fresh) { headers['Cookie'] = '__test=' + fresh; return await makeRequest(url.hostname, url.port || 80, url.pathname + (url.search || ''), options.method || 'GET', headers, body); }
  }
  return res;
}

const cmd = process.argv[2];

async function createKey(company) {
  const r = await apiRequest('/admin/create-key.php', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company, secret: ADMIN_SECRET }),
  });
  const result = JSON.parse(r.body);
  if (result.valid) {
    console.log(`\n  Product Key: ${result.product_key}`);
    console.log(`  Company:     ${result.company}\n`);
  } else { console.error('  Error:', result.error); }
}

async function deactivateKey(key) {
  console.log(`\n  Deactivating key: ${key}...`);
  const r = await apiRequest('/admin/deactivate.php', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, secret: ADMIN_SECRET }),
  });
  const result = JSON.parse(r.body);
  if (result.valid) {
    console.log(`  ${result.message}\n`);
    if (result.affected_macs?.length > 0) console.log(`  Affected MACs: ${result.affected_macs.join(', ')}`);
  } else { console.error('  Error:', result.error); }
}

async function reactivateKey(key) {
  console.log(`\n  Reactivating key: ${key}...`);
  const r = await apiRequest('/admin/reactivate.php', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, secret: ADMIN_SECRET }),
  });
  const result = JSON.parse(r.body);
  if (result.valid) { console.log(`  ${result.message}\n`); } else { console.error('  Error:', result.error); }
}

async function cleanupKey(key) {
  console.log(`\n  Cleaning up excess activations for: ${key}...`);
  const r = await apiRequest('/admin/cleanup.php', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, secret: ADMIN_SECRET }),
  });
  const result = JSON.parse(r.body);
  if (result.valid) { console.log(`  ${result.message}\n`); } else { console.error('  Error:', result.error); }
}

async function deleteKey(key) {
  console.log(`\n  Permanently deleting key: ${key}...`);
  const r = await apiRequest('/admin/delete.php', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, secret: ADMIN_SECRET }),
  });
  const result = JSON.parse(r.body);
  if (result.valid) { console.log(`  ${result.message}\n`); } else { console.error('  Error:', result.error); }
}

async function listKeys() {
  const r = await apiRequest('/admin/list.php?secret=' + ADMIN_SECRET);
  const result = JSON.parse(r.body);
  console.log('\n── Licenses ──');
  for (const l of result.licenses) console.log(`  ${l.product_key}  |  ${l.company_name.padEnd(20)}  |  ${l.status}  |  ${l.created_at}`);
  console.log('\n── Activations ──');
  for (const a of result.activations) console.log(`  ${a.product_key}  |  ${a.mac_address}  |  ${a.activated_at}`);
  if (result.blacklist?.length > 0) {
    console.log('\n── Blacklist ──');
    for (const b of result.blacklist) console.log(`  ${b.mac_address}  |  ${b.reason}  |  ${b.created_at}`);
  }
  console.log();
}

async function main() {
  switch (cmd) {
    case 'create': if (!process.argv[3]) { console.log('Usage: node admin.js create "Company Name"'); return; } await createKey(process.argv[3]); break;
    case 'deactivate': if (!process.argv[3]) { console.log('Usage: node admin.js deactivate PRODUCT_KEY'); return; } await deactivateKey(process.argv[3]); break;
    case 'reactivate': if (!process.argv[3]) { console.log('Usage: node admin.js reactivate PRODUCT_KEY'); return; } await reactivateKey(process.argv[3]); break;
    case 'cleanup': if (!process.argv[3]) { console.log('Usage: node admin.js cleanup PRODUCT_KEY'); return; } await cleanupKey(process.argv[3]); break;
    case 'delete': if (!process.argv[3]) { console.log('Usage: node admin.js delete PRODUCT_KEY'); return; } await deleteKey(process.argv[3]); break;
    case 'list': await listKeys(); break;
    default:
      console.log('\n  Pixel Art POS — License Admin\n');
      console.log('  Usage:');
      console.log('    node admin.js create "Company Name"     Generate a new product key');
      console.log('    node admin.js list                     List all keys & activations');
      console.log('    node admin.js deactivate KEY           Deactivate a product key');
      console.log('    node admin.js reactivate KEY           Reactivate a deactivated key');
      console.log('    node admin.js cleanup KEY              Remove duplicate activations');
      console.log('    node admin.js delete KEY               Permanently delete key from server\n');
  }
}
main().catch(e => console.error('Error:', e.message));
