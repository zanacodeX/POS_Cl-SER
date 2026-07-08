const { app, BrowserWindow, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let configPath;
let mainWindow;

function getServerUrl() {
  const idx = process.argv.indexOf('--server');
  if (idx !== -1 && process.argv.length > idx + 1) {
    return process.argv[idx + 1];
  }
  return null;
}

function readSavedUrl() {
  try { return fs.readFileSync(configPath, 'utf8').trim(); } catch { return null; }
}

function saveUrl(url) {
  try { fs.writeFileSync(configPath, url, 'utf8'); } catch {}
}

app.on('ready', async () => {
  configPath = path.join(app.getPath('userData'), 'server-url.txt');

  let url = getServerUrl();
  if (!url) url = readSavedUrl();

  if (!url) {
    await dialog.showMessageBox({
      type: 'info',
      title: 'Pixel Art POS Client',
      message: 'Launch with the --server flag:\n\nPixel Art POS Client.exe --server http://SERVER_IP:3000',
      buttons: ['OK']
    });
    app.quit();
    return;
  }

  saveUrl(url);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadURL(url);
  mainWindow.on('closed', () => { mainWindow = null; });
});

app.on('window-all-closed', () => {
  app.quit();
});
