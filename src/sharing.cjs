'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawn, execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execute = promisify(execFile);
const RETENTION = 24 * 60 * 60 * 1000;
const SHARE_NAME = /^clip-[a-f0-9-]{36}\.mp4$/;

function shareExportMode(info, mode) {
  if (!['copy', 'precise'].includes(mode)) throw new Error('Invalid share mode');
  return mode === 'copy' && info.codec === 'h264' && (!info.hasAudio || info.audioCodec === 'aac') ? 'copy' : 'precise';
}
async function prepareShare({ directory, input, info, start, end, mode, speed = 1, tools, signal, onProgress, exportClip }) {
  await fs.mkdir(directory, { recursive: true });
  const id = randomUUID();
  const output = path.join(directory, `clip-${id}.mp4`);
  try {
    const result = await exportClip({ input, output, start, end, totalDuration: info.duration,
      mode: shareExportMode(info, mode), speed, tools, signal, onProgress });
    return { id, path: output, name: 'Framecut.mp4', size: result.size, duration: result.duration };
  } catch (error) { await fs.rm(output, { force: true }).catch(() => {}); throw error; }
}
async function cleanShares(directory, now = Date.now()) {
  await fs.mkdir(directory, { recursive: true });
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (!entry.isFile() || !SHARE_NAME.test(entry.name)) continue;
    const filePath = path.resolve(directory, entry.name);
    if (path.dirname(filePath) !== path.resolve(directory)) continue;
    try { if (now - (await fs.stat(filePath)).mtimeMs > RETENTION) await fs.unlink(filePath); }
    catch { /* A receiving application can still hold the file open. */ }
  }
}
async function copyFile(filePath) {
  await fs.access(filePath);
  const script = "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.Windows.Forms; $files = New-Object System.Collections.Specialized.StringCollection; [void]$files.Add($env:FRAMECUT_SHARE_FILE); [System.Windows.Forms.Clipboard]::SetFileDropList($files)";
  await execute(path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
    ['-NoProfile', '-NonInteractive', '-STA', '-WindowStyle', 'Hidden', '-Command', script],
    { windowsHide: true, timeout: 15000, env: { ...process.env, FRAMECUT_SHARE_FILE: filePath }, maxBuffer: 65536 });
}
function executableFromCommand(command) {
  const match = String(command).match(/(?:^|REG_SZ\s+)(?:"([^"]+\.exe)"|([^"\r\n]+?\.exe))(?:\s|$)/i);
  return match ? match[1] || match[2] : null;
}
async function findTelegram() {
  const candidates = [
    path.join(process.env.APPDATA || '', 'Telegram Desktop', 'Telegram.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Telegram Desktop', 'Telegram.exe'),
    path.join(process.env.ProgramFiles || '', 'Telegram Desktop', 'Telegram.exe'),
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'Telegram.exe')
  ];
  const reg = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'reg.exe');
  for (const key of ['HKCU\\Software\\Classes\\tg\\shell\\open\\command', 'HKCR\\tg\\shell\\open\\command']) {
    try {
      const { stdout } = await execute(reg, ['query', key, '/ve'], { windowsHide: true, timeout: 5000 });
      const candidate = executableFromCommand(stdout);
      if (candidate && /^telegram(?: desktop)?\.exe$/i.test(path.win32.basename(candidate))) candidates.unshift(candidate);
    } catch { /* Fall back to standard installation paths. */ }
  }
  for (const candidate of candidates) {
    if (!path.isAbsolute(candidate)) continue;
    try { if ((await fs.stat(candidate)).isFile()) return candidate; } catch { /* Try the next installation. */ }
  }
  return null;
}
async function launch(executable, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(executable, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.once('error', reject); child.once('spawn', () => { child.unref(); resolve(); });
  });
}
async function openDiscord(shell) {
  for (const edition of ['Discord', 'DiscordPTB', 'DiscordCanary']) {
    const root = path.join(process.env.LOCALAPPDATA || '', edition);
    try {
      const folders = (await fs.readdir(root)).filter(name => /^app-[\d.]+$/.test(name)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
      for (const folder of folders) {
        const executable = path.join(root, folder, `${edition}.exe`);
        try { await fs.access(executable); await launch(executable, []); return; } catch { /* Try another installation. */ }
      }
    } catch { /* Try the URI handler when no desktop installation is found. */ }
  }
  await shell.openExternal('discord://-/channels/@me');
}
async function openTarget(target, filePath, shell) {
  if (!['telegram', 'discord', 'clipboard'].includes(target)) throw new Error('Invalid sharing target');
  await fs.access(filePath);
  if (target === 'telegram') {
    const executable = await findTelegram();
    if (executable) {
      await launch(executable, ['--', filePath]);
      return { method: 'telegram' };
    }
  }
  await copyFile(filePath);
  if (target !== 'clipboard') {
    try { if (target === 'discord') await openDiscord(shell); else await shell.openExternal('tg://'); }
    catch { return { method: 'clipboard', opened: false }; }
  }
  return { method: 'clipboard', opened: target !== 'clipboard' };
}
module.exports = { RETENTION, shareExportMode, prepareShare, cleanShares, copyFile, executableFromCommand, findTelegram, openTarget };
