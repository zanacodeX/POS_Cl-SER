const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Load config from %APPDATA% (writable) so installed users can edit DB settings
const appDataDir = process.env.APPDATA ? path.join(process.env.APPDATA, 'Pixel Art POS Server') : null;
const configPath = appDataDir ? path.join(appDataDir, 'config.env') : null;
if (configPath && fs.existsSync(configPath)) {
  dotenv.config({ path: configPath });
} else {
  // First run — copy packaged .env to writable location
  dotenv.config({ path: path.join(__dirname, '.env') });
  if (configPath) {
    try {
      if (!fs.existsSync(appDataDir)) fs.mkdirSync(appDataDir, { recursive: true });
      const srcEnv = path.join(__dirname, '.env');
      if (fs.existsSync(srcEnv)) fs.copyFileSync(srcEnv, configPath);
    } catch {}
  }
}

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const customerRoutes = require('./routes/customers');
const supplierRoutes = require('./routes/suppliers');
const orderRoutes = require('./routes/orders');
const purchaseOrderRoutes = require('./routes/purchase_orders');
const customerPaymentRoutes = require('./routes/customer_payments');
const reportRoutes = require('./routes/reports');
const priceTierRoutes = require('./routes/price-tiers');
const licenseRoutes = require('./routes/license');
const { requireLicense } = require('./middleware/license');
const { printReceipt, getPrinters } = require('./services/printer');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api/auth', authRoutes);
app.use('/api/license', licenseRoutes);
app.use('/api', requireLicense);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/customer-payments', customerPaymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/price-tiers', priceTierRoutes);

app.get('/api/print/receipt', (req, res) => {
  res.json(getPrinters());
});

app.post('/api/print/receipt', (req, res) => {
  const result = printReceipt(req.body);
  res.json(result);
});

const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get('/{*path}', (req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint not found.' });
  }
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) {
      res.status(404).json({ error: 'Frontend not built yet.' });
    }
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

function getLanIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}

async function start(port) {
  const p = port || PORT;

  // Test DB connection with a helpful error
  try {
    const { query } = require('./config/db');
    await query('SELECT 1');
  } catch (err) {
    console.error('\n\x1b[31m⚠ MySQL Connection Failed!\x1b[0m');
    console.error('  Make sure WAMP is running and MySQL is started.');
    console.error('  Expected config (edit backend/.env if different):');
    console.error(`    Host: ${process.env.DB_HOST || 'localhost'}`);
    console.error(`    Port: ${parseInt(process.env.DB_PORT) || 3306}`);
    console.error(`    User: ${process.env.DB_USER || 'root'}`);
    console.error(`    Password: ${process.env.DB_PASSWORD || '(empty)'}`);
    console.error(`    Database: ${process.env.DB_NAME || 'pos_system'}`);
    console.error('\n  Steps:');
    console.error('  1. Open WAMP → click icon → MySQL → Start');
    console.error('  2. Wait for WAMP icon to turn green');
    console.error('  3. If MySQL has a password, update backend/.env');
    console.error('  4. Restart this app.\n');
    process.exit(1);
  }

  return new Promise((resolve) => {
    const srv = app.listen(p, () => {
      const lanIp = getLanIp();
      console.log(`\n  ✓ Server started successfully`);
      console.log(`  Local:    http://localhost:${p}`);
      console.log(`  Network:  http://${lanIp}:${p}\n`);
      resolve(srv);
    });
  });
}

if (require.main === module) {
  start().catch(err => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
}

module.exports = { app, start };
