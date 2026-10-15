'use strict';
const { app, net, shell } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { RELEASES, MANIFEST_URL, compareVersions, verifyManifest, verifyFile } = require('./update-core.cjs');

class Updater {
  constructor(emit, canInstall, beforeInstall) {
    this.emit = emit; this.canInstall = canInstall; this.beforeInstall = beforeInstall;
    this.state = { status: 'idle', version: app.getVersion(), portable: Boolean(process.env.PORTABLE_EXECUTABLE_FILE), development: !app.isPackaged };
    this.controller = null; this.manifest = null; this.downloaded = null;
  }
  publish(data) { this.state = { ...this.state, ...data }; this.emit('update-state', { state: this.state }); return this.state; }
  start() {
    if (!app.isPackaged) return;
    this.startTimer = setTimeout(() => this.check(), 15000);
    this.interval = setInterval(() => this.check(), 6 * 60 * 60 * 1000);
    this.startTimer.unref(); this.interval.unref();
  }
  async check() {
    if (['checking', 'downloading', 'ready', 'installing'].includes(this.state.status)) return this.state;
    this.publish({ status: 'checking' });
    try {
      const response = await net.fetch(MANIFEST_URL, { signal: AbortSignal.timeout(30000), cache: 'no-store' });
      if (!response.ok) throw new Error(`Update feed: ${response.status}`);
      const reader = response.body.getReader();
      const chunks = []; let size = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.length;
        if (size > 65536) { await reader.cancel(); throw new Error('Update manifest is too large'); }
        chunks.push(value);
      }
      const envelope = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const publicKey = await fs.readFile(path.join(__dirname, '..', 'assets', 'update-public.pem'), 'utf8');
      this.manifest = verifyManifest(envelope, publicKey);
      return this.publish({ status: compareVersions(this.manifest.version, app.getVersion()) > 0 ? 'available' : 'current', version: this.manifest.version });
    } catch (error) {
      console.error('Update check:', error.message);
      return this.publish({ status: 'error' });
    }
  }
  async download() {
    if (!this.manifest || this.state.status !== 'available') return this.state;
    if (this.state.portable || this.state.development) { await shell.openExternal(`${RELEASES}/latest`); return this.state; }
    this.controller = new AbortController();
    const directory = path.join(app.getPath('userData'), 'updates');
    const temporary = path.join(directory, `${randomUUID()}.download`);
    const destination = path.join(directory, this.manifest.installer.name);
    let handle;
    let idleTimer;
    const resetTimeout = () => { clearTimeout(idleTimer); idleTimer = setTimeout(() => this.controller?.abort(), 90000); };
    this.publish({ status: 'downloading', progress: 0, transferred: 0, total: this.manifest.installer.size, bytesPerSecond: 0 });
    try {
      await fs.mkdir(directory, { recursive: true });
      resetTimeout();
      const response = await net.fetch(this.manifest.installer.url, { signal: this.controller.signal });
      if (!response.ok) throw new Error(`Update download: ${response.status}`);
      handle = await fs.open(temporary, 'wx');
      let downloaded = 0, lastProgress = 0, lastBytes = 0, speedTime = Date.now(), bytesPerSecond = 0;
      for await (const chunk of response.body) {
        resetTimeout(); downloaded += chunk.length;
        if (downloaded > this.manifest.installer.size) throw new Error('Update size mismatch');
        await handle.writeFile(chunk);
        const now = Date.now();
        if (now - speedTime >= 500) { bytesPerSecond = (downloaded - lastBytes) * 1000 / (now - speedTime); speedTime = now; lastBytes = downloaded; }
        if (now - lastProgress > 120) {
          this.publish({ progress: downloaded / this.manifest.installer.size, transferred: downloaded, bytesPerSecond }); lastProgress = now;
        }
      }
      await handle.close(); handle = null;
      await verifyFile(temporary, this.manifest.installer);
      await fs.rename(temporary, destination); this.downloaded = destination;
      return this.publish({ status: 'ready', progress: 1 });
    } catch (error) {
      console.error('Update download:', error.message);
      return this.publish({ status: this.controller.signal.aborted ? 'available' : 'error', progress: 0 });
    } finally {
      clearTimeout(idleTimer); this.controller = null;
      await handle?.close().catch(() => {});
      await fs.rm(temporary, { force: true }).catch(() => {});
    }
  }
  cancel() { this.controller?.abort(); }
  async install() {
    if (this.state.status !== 'ready' || !this.downloaded || !this.canInstall()) throw Object.assign(new Error('Busy'), { code: 'BUSY' });
    // Reverify immediately before execution, including already cached downloads.
    await verifyFile(this.downloaded, this.manifest.installer);
    if (!this.canInstall()) throw Object.assign(new Error('Busy'), { code: 'BUSY' });
    this.publish({ status: 'installing' });
    try {
      await new Promise((resolve, reject) => {
        const child = spawn(this.downloaded, ['/S', '--updated', '--force-run'], { detached: true, stdio: 'ignore', windowsHide: true });
        child.once('error', reject); child.once('spawn', () => { child.unref(); resolve(); });
      });
    } catch (error) { this.publish({ status: 'ready' }); throw error; }
    this.beforeInstall(); app.quit();
  }
  stop() { clearTimeout(this.startTimer); clearInterval(this.interval); this.cancel(); }
}
module.exports = { Updater };
