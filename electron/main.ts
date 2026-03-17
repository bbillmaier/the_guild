import path from 'path';
import fs from 'fs';
import { app, BrowserWindow, protocol, net } from 'electron';
import { initDatabase, registerDbHandlers, registerFsHandlers } from './db';

// Must be called before app.whenReady()
protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: {
    standard: true,
    secure: true,
    supportFetchAPI: true,
    corsEnabled: false,
  },
}]);

app.setName('The Guild');

function createWindow(): BrowserWindow {
  const useDevServer = process.argv.includes('--dev-server');

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'The Guild',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (useDevServer) {
    void win.loadURL('http://localhost:8081');
    win.webContents.openDevTools();
  } else {
    void win.loadURL('app://main/');
  }

  win.webContents.on('before-input-event', (_event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      } else {
        win.webContents.openDevTools();
      }
    }
  });

  return win;
}

app.whenReady().then(async () => {
  // Serve the Expo web export via a custom scheme so that:
  //  - Relative asset paths work (app://main/_expo/static/...)
  //  - Any unknown path falls back to index.html (SPA routing)
  const distDir = path.join(__dirname, '..', '..', 'dist');

  const userDataDir = app.getPath('userData');

  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    const rel = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

    // User-generated files (saved images, etc.) — served from userData directory.
    // URLs look like: app://main/userdata/images/characters/.../avatar.png
    if (rel.startsWith('userdata/')) {
      const filePath = path.join(userDataDir, rel.slice('userdata/'.length));
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        return net.fetch('file://' + filePath);
      }
    }

    const filePath = path.join(distDir, rel);

    // Serve the file if it exists, otherwise fall back to index.html
    if (rel && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return net.fetch('file://' + filePath);
    }

    // Expo web export places node_modules assets at assets/node_modules/... with
    // a content hash appended to the filename (e.g. MaterialIcons.abc123.ttf).
    // electron-builder strips nested node_modules from the ASAR, so these files
    // aren't in dist/. Fall back to the root node_modules copy (no hash).
    if (rel.startsWith('assets/node_modules/')) {
      const withoutPrefix = rel.slice('assets/'.length); // node_modules/...
      const dehashed = withoutPrefix.replace(/\.[0-9a-f]{32}(\.[^.]+)$/, '$1');
      const nodeModulesPath = path.join(__dirname, '..', '..', dehashed);
      if (fs.existsSync(nodeModulesPath) && fs.statSync(nodeModulesPath).isFile()) {
        return net.fetch('file://' + nodeModulesPath);
      }
    }

    return net.fetch('file://' + path.join(distDir, 'index.html'));
  });

  try {
    await initDatabase();
  } catch (err) {
    console.error('[main] Database init failed:', err);
  }

  registerDbHandlers();
  registerFsHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
