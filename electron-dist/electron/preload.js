"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    db: {
        /** Returns all matching rows */
        all: (sql, params) => electron_1.ipcRenderer.invoke('db:all', sql, params ?? []),
        /** Returns the first matching row, or null */
        get: (sql, params) => electron_1.ipcRenderer.invoke('db:get', sql, params ?? []),
        /** Executes a write statement; returns { lastInsertRowId, changes } */
        run: (sql, params) => electron_1.ipcRenderer.invoke('db:run', sql, params ?? []),
        /** Executes one or more SQL statements with no result (CREATE TABLE, etc.) */
        exec: (sql) => electron_1.ipcRenderer.invoke('db:exec', sql),
    },
    fs: {
        /** Download an image from a URL, save to userData subfolder, return local path */
        saveImage: (url, subfolder, filename) => electron_1.ipcRenderer.invoke('fs:saveImage', url, subfolder, filename),
        /** Return the Electron userData directory path */
        getUserDataPath: () => electron_1.ipcRenderer.invoke('fs:getUserDataPath'),
    },
});
