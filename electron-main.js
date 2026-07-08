const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;
let server;

function getServerUrl() {
  const idx = process.argv.indexOf('--server');
  if (idx !== -1 && process.argv.length > idx + 1) {
    return process.argv[idx + 1];
  }
  return null;
}

async function createWindow() {
  try {
    const serverUrl = getServerUrl();

    if (serverUrl) {
      // Client mode: connect to remote server
      mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      mainWindow.loadURL(serverUrl);
    } else {
      // Server mode: start backend locally
      server = require('./backend/server');
      await server.start(3000);
      mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });
      mainWindow.loadURL('http://localhost:3000');
    }

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
