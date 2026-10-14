// The only channel between the page and the computer. Nothing else is exposed.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('kakuNative', {
  load: () => ipcRenderer.invoke('kaku:load'),
  save: (data) => ipcRenderer.invoke('kaku:save', data),
  info: () => ipcRenderer.invoke('kaku:info'),
  exportFile: (data) => ipcRenderer.invoke('kaku:export', data),
  importFile: () => ipcRenderer.invoke('kaku:import'),
  chooseFolder: () => ipcRenderer.invoke('kaku:chooseFolder'),
  openWeb: () => ipcRenderer.invoke('kaku:openWeb'),
  // switching the conversation partner to a model needs the window served rather than
  // opened off the disk, so the browser will hand it the graphics card
  pageFor: (how) => ipcRenderer.invoke('kaku:pageFor', how),
  // a different route to the graphics card, which takes a restart
  gpuPath: (which) => ipcRenderer.invoke('kaku:gpuPath', which),
  gpuNow: () => ipcRenderer.invoke('kaku:gpuNow'),
  // the same served page in a real browser, which can listen where this window cannot
  openHere: () => ipcRenderer.invoke('kaku:openHere'),
  onMenu: (fn) => ipcRenderer.on('menu', (e, action) => fn(action))
});
