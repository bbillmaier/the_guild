"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const electron_1 = require("electron");
const db_1 = require("./db");
// Must be called before app.whenReady()
electron_1.protocol.registerSchemesAsPrivileged([{
        scheme: 'app',
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            corsEnabled: false,
        },
    }]);
electron_1.app.setName('The Guild');
function createWindow() {
    const useDevServer = process.argv.includes('--dev-server');
    const win = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        title: 'The Guild',
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    if (useDevServer) {
        void win.loadURL('http://localhost:8081');
        win.webContents.openDevTools();
    }
    else {
        void win.loadURL('app://main/');
    }
    win.webContents.on('before-input-event', (_event, input) => {
        if (input.type === 'keyDown' && input.key === 'F12') {
            if (win.webContents.isDevToolsOpened()) {
                win.webContents.closeDevTools();
            }
            else {
                win.webContents.openDevTools();
            }
        }
    });
    return win;
}
electron_1.app.whenReady().then(async () => {
    // Serve the Expo web export via a custom scheme so that:
    //  - Relative asset paths work (app://main/_expo/static/...)
    //  - Any unknown path falls back to index.html (SPA routing)
    const distDir = path_1.default.join(__dirname, '..', '..', 'dist');
    const userDataDir = electron_1.app.getPath('userData');
    electron_1.protocol.handle('app', (request) => {
        const url = new URL(request.url);
        const rel = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
        // User-generated files (saved images, etc.) — served from userData directory.
        // URLs look like: app://main/userdata/images/characters/.../avatar.png
        if (rel.startsWith('userdata/')) {
            const filePath = path_1.default.join(userDataDir, rel.slice('userdata/'.length));
            if (fs_1.default.existsSync(filePath) && fs_1.default.statSync(filePath).isFile()) {
                return electron_1.net.fetch('file://' + filePath);
            }
        }
        const filePath = path_1.default.join(distDir, rel);
        // Serve the file if it exists, otherwise fall back to index.html
        if (rel && fs_1.default.existsSync(filePath) && fs_1.default.statSync(filePath).isFile()) {
            return electron_1.net.fetch('file://' + filePath);
        }
        // Expo web export places node_modules assets at assets/node_modules/... with
        // a content hash appended to the filename (e.g. MaterialIcons.abc123.ttf).
        // electron-builder strips nested node_modules from the ASAR, so these files
        // aren't in dist/. Fall back to the root node_modules copy (no hash).
        if (rel.startsWith('assets/node_modules/')) {
            const withoutPrefix = rel.slice('assets/'.length); // node_modules/...
            const dehashed = withoutPrefix.replace(/\.[0-9a-f]{32}(\.[^.]+)$/, '$1');
            const nodeModulesPath = path_1.default.join(__dirname, '..', '..', dehashed);
            if (fs_1.default.existsSync(nodeModulesPath) && fs_1.default.statSync(nodeModulesPath).isFile()) {
                return electron_1.net.fetch('file://' + nodeModulesPath);
            }
        }
        return electron_1.net.fetch('file://' + path_1.default.join(distDir, 'index.html'));
    });
    try {
        await (0, db_1.initDatabase)();
    }
    catch (err) {
        console.error('[main] Database init failed:', err);
    }
    (0, db_1.registerDbHandlers)();
    (0, db_1.registerFsHandlers)();
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
