'use strict';
const { app, BrowserWindow, dialog, ipcMain, Menu, protocol, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const media = require('./media.cjs');
const { serveMedia } = require('./media-protocol.cjs');
const { Updater } = require('./updater.cjs');
const { dictionaries, normalizeLanguage, translate } = require('./shared/i18n.js');

protocol.registerSchemesAsPrivileged([{ scheme: 'framecut-media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
app.setName('Framecut');
app.setAppUserModelId('io.github.salvehn.framecut');
const smoke = process.argv.includes('--smoke-test');
if (smoke && !app.isPackaged) app.setPath('userData', path.resolve(process.env.FRAMECUT_TEST_DIR || path.join(__dirname, '..', 'test-artifacts', 'profile')));

let window;
let preferences;
let preferencesPath;
let cacheDirectory;
let tools;
let current;
let opening;
let exporting;
let lastExport;
let updater;
let closing = false;
const mediaFiles = new Map();
const t = (key, values) => translate(preferences?.language || 'en', key, values);
const emit = (type, data = {}) => { if (window && !window.isDestroyed()) window.webContents.send('app-event', { type, ...data }); };
const mediaUrl = filePath => {
  const id = randomUUID();
  mediaFiles.set(id, filePath);
  return `framecut-media://local/${id}`;
};

async function loadPreferences() {
  preferencesPath = path.join(app.getPath('userData'), 'preferences.json');
  const defaults = { language: normalizeLanguage(app.getLocale()), recent: [], volume: 0.8, mode: 'precise' };
  try {
    const saved = JSON.parse(await fs.readFile(preferencesPath, 'utf8'));
    return { ...defaults, language: normalizeLanguage(saved.language || defaults.language),
      recent: Array.isArray(saved.recent) ? saved.recent.filter(item => typeof item.id === 'string' && typeof item.path === 'string').slice(0, 12) : [],
      volume: typeof saved.volume === 'number' ? Math.max(0, Math.min(1, saved.volume)) : defaults.volume,
      mode: ['precise', 'copy'].includes(saved.mode) ? saved.mode : defaults.mode };
  } catch { return defaults; }
}

let saveQueue = Promise.resolve();
function savePreferences() {
  const content = JSON.stringify(preferences, null, 2);
  saveQueue = saveQueue.catch(() => {}).then(async () => {
    await fs.mkdir(path.dirname(preferencesPath), { recursive: true });
    const temp = `${preferencesPath}.tmp`;
    await fs.writeFile(temp, content, 'utf8');
    await fs.rename(temp, preferencesPath);
  });
  return saveQueue;
}

function recentPublic() {
  return preferences.recent.map(({ id, path: filePath, duration, openedAt }) => ({ id, name: path.basename(filePath), duration, openedAt }));
}

async function openMedia(filePath) {
  if (exporting || updater?.state.status === 'installing') throw Object.assign(new Error('Export or update is in progress'), { code: 'BUSY' });
  opening?.abort();
  const controller = new AbortController();
  opening = controller;
  emit('loading', { name: path.basename(filePath) });
  try {
    const resolved = await fs.realpath(filePath);
    const stat = await fs.stat(resolved);
    if (!stat.isFile()) throw new Error('Not a file');
    const info = await media.probe(resolved, tools, { signal: controller.signal });
    if (controller.signal.aborted) throw Object.assign(new Error('Cancelled'), { code: 'CANCELLED' });
    const id = randomUUID();
    current = { id, path: resolved, info, previewPath: null };
    mediaFiles.clear();
    const existing = preferences.recent.find(item => item.path.toLowerCase() === resolved.toLowerCase());
    preferences.recent = [{ id: existing?.id || randomUUID(), path: resolved, duration: info.duration, openedAt: Date.now() },
      ...preferences.recent.filter(item => item.path.toLowerCase() !== resolved.toLowerCase())].slice(0, 12);
    await savePreferences().catch(() => {});
    emit('recent', { items: recentPublic() });
    return { id, name: path.basename(resolved), ...info, url: mediaUrl(resolved), nativePreview: media.nativePreviewSupported(resolved, info) };
  } finally {
    if (opening === controller) opening = null;
  }
}

async function preparePreview(id) {
  if (!current || current.id !== id) throw new Error('Unknown media');
  if (current.previewPath) return { url: mediaUrl(current.previewPath) };
  const selected = current;
  const controller = new AbortController();
  opening?.abort();
  opening = controller;
  const previewPath = path.join(cacheDirectory, `${id}.mp4`);
  try {
    await media.createPreview(selected.path, previewPath, tools, {
      duration: selected.info.duration, signal: controller.signal,
      onProgress: progress => emit('preview-progress', { progress })
    });
    if (current !== selected) throw Object.assign(new Error('Cancelled'), { code: 'CANCELLED' });
    selected.previewPath = previewPath;
    return { url: mediaUrl(previewPath) };
  } finally { if (opening === controller) opening = null; }
}

async function chooseAndExport(options) {
  if (exporting || opening || updater?.state.status === 'installing') throw Object.assign(new Error('Busy'), { code: 'BUSY' });
  if (!current || options?.id !== current.id) throw new Error('Unknown media');
  if (!['precise', 'copy'].includes(options.mode)) throw Object.assign(new Error('Unknown mode'), { code: 'INVALID_MODE' });
  media.validateRange(options.start, options.end, current.info.duration);
  const selected = current;
  const sourceExtension = path.extname(selected.path).toLowerCase();
  const extension = options.mode === 'precise' ? '.mp4' : ['.mp4', '.mkv', '.mov', '.webm', '.m4v', '.avi', '.ts'].includes(sourceExtension) ? sourceExtension : '.mkv';
  const suggested = `${path.basename(selected.path, path.extname(selected.path))}_clip${extension}`;
  const { canceled, filePath } = await dialog.showSaveDialog(window, {
    title: t('saveDialog'), buttonLabel: t('saveClip'), defaultPath: path.join(path.dirname(selected.path), suggested),
    filters: [{ name: options.mode === 'precise' ? 'MP4 (H.264 / AAC)' : extension.slice(1).toUpperCase(), extensions: [extension.slice(1)] }]
  });
  if (canceled || !filePath) return { cancelled: true };
  // Reserve the operation before any further asynchronous work.
  if (exporting || current !== selected) throw Object.assign(new Error('Busy'), { code: 'BUSY' });
  const controller = new AbortController();
  exporting = controller;
  emit('export-start');
  try {
    const result = await media.exportClip({ input: selected.path, output: filePath,
      start: options.start, end: options.end, totalDuration: selected.info.duration,
      mode: options.mode, tools, signal: controller.signal,
      onProgress: progress => emit('export-progress', { progress }) });
    lastExport = result.output;
    return { name: path.basename(result.output), size: result.size, duration: result.duration };
  } finally { exporting = null; emit('export-finished'); }
}

function registerIpc() {
  const handle = (channel, callback) => ipcMain.handle(channel, async (event, ...args) => {
    if (event.sender !== window?.webContents || event.senderFrame !== window.webContents.mainFrame) throw new Error('Untrusted sender');
    try { return { ok: true, value: await callback(...args) }; }
    catch (error) {
      if (error.code !== 'CANCELLED') console.error(`[${channel}]`, error.message);
      return { ok: false, code: error.code || (error.code === 'ENOENT' ? 'MISSING_FILE' : 'MEDIA_ERROR') };
    }
  });
  handle('bootstrap', () => ({ version: app.getVersion(), language: preferences.language, volume: preferences.volume, mode: preferences.mode, recent: recentPublic(), update: updater.state }));
  handle('update-check', () => updater.check());
  handle('update-download', () => updater.download());
  handle('update-cancel', () => updater.cancel());
  handle('update-install', () => updater.install());
  handle('open-file', async () => {
    if (exporting) throw Object.assign(new Error('Busy'), { code: 'BUSY' });
    const result = await dialog.showOpenDialog(window, { title: t('openDialog'), buttonLabel: t('openVideo'), properties: ['openFile'], filters: [
      { name: t('videoFiles'), extensions: ['mp4', 'mkv', 'mov', 'avi', 'webm', 'm4v', 'wmv', 'mpg', 'mpeg', 'ts', 'mts', 'm2ts', 'ogv', '3gp', 'flv'] },
      { name: t('allFiles'), extensions: ['*'] }
    ] });
    return result.canceled ? null : openMedia(result.filePaths[0]);
  });
  handle('open-recent', id => {
    const recent = preferences.recent.find(item => item.id === id);
    if (!recent) throw new Error('Unknown recent file');
    return openMedia(recent.path);
  });
  handle('open-dropped', filePath => {
    if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) throw new Error('Invalid dropped file');
    return openMedia(filePath);
  });
  handle('prepare-preview', preparePreview);
  handle('export-clip', chooseAndExport);
  handle('cancel-export', () => { exporting?.abort(); });
  handle('cancel-open', () => { opening?.abort(); });
  handle('set-language', async language => {
    if (!Object.hasOwn(dictionaries, language)) throw new Error('Unsupported language');
    preferences.language = language;
    await savePreferences();
  });
  handle('set-preferences', async values => {
    if (typeof values?.volume === 'number' && Number.isFinite(values.volume)) preferences.volume = Math.max(0, Math.min(1, values.volume));
    if (['precise', 'copy'].includes(values?.mode)) preferences.mode = values.mode;
    await savePreferences();
  });
  handle('reveal-export', () => { if (lastExport) shell.showItemInFolder(lastExport); });
  handle('window-control', action => {
    if (action === 'minimize') window.minimize();
    if (action === 'maximize') window.isMaximized() ? window.unmaximize() : window.maximize();
    if (action === 'close') window.close();
    if (action === 'fullscreen') window.setFullScreen(!window.isFullScreen());
    if (action === 'exit-fullscreen') window.setFullScreen(false);
  });
}

function createWindow() {
  window = new BrowserWindow({ width: 1180, height: 790, minWidth: 960, minHeight: 680,
    backgroundColor: '#101114', frame: false, show: false, title: 'Framecut',
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true,
      nodeIntegration: false, sandbox: true, webSecurity: true, spellcheck: false }
  });
  Menu.setApplicationMenu(null);
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
  window.webContents.session.setPermissionCheckHandler(() => false);
  window.once('ready-to-show', () => window.show());
  window.on('enter-full-screen', () => emit('fullscreen', { active: true }));
  window.on('leave-full-screen', () => emit('fullscreen', { active: false }));
  window.on('close', event => {
    if (closing) return;
    if (exporting) {
      event.preventDefault();
      dialog.showMessageBox(window, { type: 'question', title: 'Framecut', message: t('closeExport'),
        buttons: [t('stay'), t('stopAndClose')], defaultId: 0, cancelId: 0 }).then(({ response }) => {
        if (response === 1) { closing = true; exporting?.abort(); opening?.abort(); window.close(); }
      });
    } else { opening?.abort(); }
  });
  window.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(async () => {
  preferences = await loadPreferences();
  tools = media.toolPaths(app.isPackaged, process.resourcesPath);
  cacheDirectory = path.join(app.getPath('temp'), `framecut-${process.pid}-${randomUUID()}`);
  await fs.mkdir(cacheDirectory, { recursive: true });
  updater = new Updater(emit, () => !opening && !exporting, () => { closing = true; });
  protocol.handle('framecut-media', request => serveMedia(request, mediaFiles));
  registerIpc();
  createWindow();
  updater.start();
  if (smoke && !app.isPackaged) require('../scripts/electron-smoke.cjs')({ window, openMedia, preparePreview, tools });
}).catch(error => { console.error(error); app.exit(1); });

app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => {
  opening?.abort(); exporting?.abort();
  updater?.stop();
  if (cacheDirectory) {
    try { require('node:fs').rmSync(cacheDirectory, { recursive: true, force: true, maxRetries: 3 }); }
    catch (error) { console.error('Preview cleanup:', error.message); }
  }
});
