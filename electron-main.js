const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const dotenv = require('dotenv');
const envPath = path.join(__dirname, 'backend', '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

let mainWindow;

function getAppDataDir() {
  const appData = process.env.APPDATA || path.join(require('os').homedir(), '.pixelartpos');
  const dir = path.join(appData, 'Pixel Art POS Server');
  try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  return dir;
}

function getLicensePath() {
  return path.join(getAppDataDir(), 'license.key');
}

function getSavedKey() {
  try {
    const f = getLicensePath();
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8').trim();
  } catch {}
  return null;
}

function getServerUrl() {
  const idx = process.argv.indexOf('--server');
  if (idx !== -1 && process.argv.length > idx + 1) {
    return process.argv[idx + 1];
  }
  return null;
}

async function showActivationWindow() {
  const win = new BrowserWindow({
    width: 520, height: 400,
    resizable: false, frame: true,
    title: 'Pixel Art POS — License Activation',
    webPreferences: { nodeIntegration: true, contextIsolation: false }
  });

  ipcMain.handle('activate-key', async (event, key) => {
    try {
      process.env.PRODUCT_KEY = key;
      const { registerProductKey, saveLicense } = require('./backend/services/license');
      await registerProductKey(key);
      saveLicense(key);
      win.close();
      return { ok: true, message: 'Activated successfully!' };
    } catch (e) {
      return { ok: false, message: e.message };
    }
  });

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui;background:#1a1a2e;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
<div style="text-align:center;max-width:400px">
  <h2 style="color:#e94560;margin:0 0 4px">Pixel Art POS</h2>
  <p style="color:#aaa;margin:0 0 24px;font-size:13px">Enter your product key to activate</p>
  <input id="key" type="text" placeholder="e.g. POS-A1B2-C3D4" style="width:100%;padding:12px;border:1px solid #333;border-radius:6px;background:#16213e;color:#fff;font-size:16px;text-align:center;box-sizing:border-box;text-transform:uppercase" autofocus>
  <p id="msg" style="font-size:13px;margin:8px 0;display:none"></p>
  <button id="btn" style="margin-top:16px;padding:12px 40px;background:#e94560;color:#fff;border:none;border-radius:6px;font-size:15px;cursor:pointer">Activate</button>
  <p id="detail" style="font-size:11px;color:#666;margin:12px 0 0;display:none"></p>
</div>
<script>
  const { ipcRenderer } = require('electron');
  const input = document.getElementById('key');
  const btn = document.getElementById('btn');
  const msg = document.getElementById('msg');
  const detail = document.getElementById('detail');
  async function submit() {
    const key = input.value.trim().toUpperCase();
    if (!key) { msg.textContent = 'Please enter a product key'; msg.style.cssText = 'color:#e94560;font-size:13px;margin:8px 0;display:block'; return; }
    btn.disabled = true; btn.textContent = 'Activating...';
    detail.style.display = 'block';
    detail.textContent = 'Connecting to license server...';
    try {
      const r = await ipcRenderer.invoke('activate-key', key);
      if (r.ok) {
        msg.style.cssText = 'color:#4ecca3;font-size:13px;margin:8px 0;display:block';
        msg.textContent = 'Activated! Starting server...';
      } else {
        btn.disabled = false; btn.textContent = 'Activate';
        msg.style.cssText = 'color:#e94560;font-size:13px;margin:8px 0;display:block';
        msg.textContent = r.message;
        detail.style.display = 'none';
      }
    } catch (e) {
      btn.disabled = false; btn.textContent = 'Activate';
      msg.style.cssText = 'color:#e94560;font-size:13px;margin:8px 0;display:block';
      msg.textContent = 'Connection failed. Check internet and try again.';
      detail.textContent = e.message || '';
    }
  }
  btn.onclick = submit;
  input.onkeydown = e => { if (e.key === 'Enter') submit(); };
</script></body></html>`;

  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
  win.setMenu(null);
  return new Promise((resolve) => {
    win.on('closed', () => resolve('done'));
  });
}

async function createWindow() {
  try {
    const serverUrl = getServerUrl();
    if (serverUrl) {
      mainWindow = new BrowserWindow({
        width: 1200, height: 800,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      });
      mainWindow.loadURL(serverUrl);
      mainWindow.on('closed', () => { mainWindow = null; });
      return;
    }

    if (!getSavedKey() && !process.env.PRODUCT_KEY && process.env.SKIP_LICENSE !== 'true') {
      console.log('No license key found, showing activation window...');
      await showActivationWindow();
    }

    const server = require('./backend/server');
    await server.start(3000);

    mainWindow = new BrowserWindow({
      width: 1200, height: 800,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    });
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.on('closed', () => { mainWindow = null; });
  } catch (err) {
    console.error('Failed to start:', err);
    app.quit();
  }
}

app.on('ready', createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('activate', () => {
  if (!mainWindow) createWindow();
});
