'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const invoke = (channel, ...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('framecut', {
  bootstrap: () => invoke('bootstrap'),
  ready: () => invoke('renderer-ready'),
  integrationState: () => invoke('integration-state'),
  setContextMenu: enabled => invoke('integration-context', enabled),
  setDefaultPlayer: () => invoke('integration-default'),
  setWindowPreset: preset => invoke('window-preset', preset),
  openFile: () => invoke('open-file'),
  closeMedia: id => invoke('close-media', id),
  openRecent: id => invoke('open-recent', id),
  openDropped: file => invoke('open-dropped', webUtils.getPathForFile(file)),
  preparePreview: id => invoke('prepare-preview', id),
  exportClip: options => invoke('export-clip', options),
  prepareShare: options => invoke('prepare-share', options),
  shareTarget: (id, target) => invoke('share-target', id, target),
  dragShare: id => ipcRenderer.send('share-drag', id),
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
