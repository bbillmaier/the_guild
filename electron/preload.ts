import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  db: {
    /** Returns all matching rows */
    all: (sql: string, params?: unknown[]) =>
      ipcRenderer.invoke('db:all', sql, params ?? []),

    /** Returns the first matching row, or null */
    get: (sql: string, params?: unknown[]) =>
      ipcRenderer.invoke('db:get', sql, params ?? []),

    /** Executes a write statement; returns { lastInsertRowId, changes } */
    run: (sql: string, params?: unknown[]) =>
      ipcRenderer.invoke('db:run', sql, params ?? []),

    /** Executes one or more SQL statements with no result (CREATE TABLE, etc.) */
    exec: (sql: string) =>
      ipcRenderer.invoke('db:exec', sql),
  },

  fs: {
    /** Download an image from a URL, save to userData subfolder, return local path */
    saveImage: (url: string, subfolder: string, filename: string) =>
      ipcRenderer.invoke('fs:saveImage', url, subfolder, filename),

    /** Return the Electron userData directory path */
    getUserDataPath: () =>
      ipcRenderer.invoke('fs:getUserDataPath'),
  },
});
