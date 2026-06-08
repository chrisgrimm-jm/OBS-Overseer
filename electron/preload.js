const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal API surface. OBS WebSocket runs in the renderer process
// directly via obs-websocket-js — no IPC relay needed for socket traffic.
// We expose only app-level utilities here.
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isDev: process.env.NODE_ENV === 'development',
  onMenuConnect: (callback) => ipcRenderer.on('menu-connect', callback),
  onMenuDisconnect: (callback) => ipcRenderer.on('menu-disconnect', callback),
});
