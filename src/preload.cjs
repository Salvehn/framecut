'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('framecut', {
  bootstrap: () => invoke('bootstrap'),
  openFile: () => invoke('open-file'),
  openRecent: id => invoke('open-recent', id),
  openDropped: file => invoke('open-dropped', webUtils.getPathForFile(file)),
  preparePreview: id => invoke('prepare-preview', id),
  exportClip: options => invoke('export-clip', options),
  releaseSource: () => invoke('release-source'),
  cancelExport: () => invoke('cancel-export'),
  cancelOpen: () => invoke('cancel-open'),
  setLanguage: language => invoke('set-language', language),
  setPreferences: preferences => invoke('set-preferences', preferences),
  revealExport: () => invoke('reveal-export'),
  checkUpdates: () => invoke('update-check'),
  downloadUpdate: () => invoke('update-download'),
  cancelUpdate: () => invoke('update-cancel'),
  installUpdate: () => invoke('update-install'),
  windowControl: action => invoke('window-control', action),
  onEvent: callback => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('app-event', listener);
    return () => ipcRenderer.removeListener('app-event', listener);
  }
});
