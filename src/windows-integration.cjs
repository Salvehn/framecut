'use strict';
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const path = require('node:path');
const execute = promisify(execFile);
const EXTENSIONS = ['mp4', 'mkv', 'mov', 'avi', 'webm', 'm4v', 'wmv', 'mpg', 'mpeg', 'ts', 'mts', 'm2ts', 'ogv', '3gp', 'flv'];
const CLASSES = 'HKCU\\Software\\Classes';
const CAPABILITIES = 'HKCU\\Software\\Framecut\\Capabilities';
const contextKey = extension => `${CLASSES}\\SystemFileAssociations\\.${extension}\\shell\\Framecut`;

function registrationEntries(executable) {
  if (!path.win32.isAbsolute(executable) || executable.includes('"')) throw new Error('Invalid executable path');
  const command = `"${executable}" "%1"`;
  const entries = [
    [`${CLASSES}\\Framecut.Video`, '', 'Framecut video'],
    [`${CLASSES}\\Framecut.Video\\DefaultIcon`, '', `"${executable}",0`],
    [`${CLASSES}\\Framecut.Video\\shell\\open\\command`, '', command],
    [`${CLASSES}\\Applications\\Framecut.exe`, 'FriendlyAppName', 'Framecut'],
    [`${CLASSES}\\Applications\\Framecut.exe\\shell\\open\\command`, '', command],
    [CAPABILITIES, 'ApplicationName', 'Framecut'],
    [CAPABILITIES, 'ApplicationDescription', 'Video player and trimmer'],
    [CAPABILITIES, 'ApplicationIcon', `"${executable}",0`],
    ['HKCU\\Software\\RegisteredApplications', 'Framecut', 'Software\\Framecut\\Capabilities']
  ];
  for (const extension of EXTENSIONS) entries.push(
    [`${CAPABILITIES}\\FileAssociations`, `.${extension}`, 'Framecut.Video'],
    [`${CLASSES}\\.${extension}\\OpenWithProgids`, 'Framecut.Video', ''],
    [`${CLASSES}\\Applications\\Framecut.exe\\SupportedTypes`, `.${extension}`, '']
  );
  return entries;
}

async function reg(args) {
  const executable = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'reg.exe');
  return execute(executable, args, { windowsHide: true, timeout: 15000, maxBuffer: 65536 });
}
async function setValue(key, name, value, type = 'REG_SZ') {
  await reg(['add', key, ...(name ? ['/v', name] : ['/ve']), '/t', type, '/d', value, '/f']);
}
async function registerApplication(executable) {
  for (const [key, name, value] of registrationEntries(executable)) await setValue(key, name, value);
}
async function setContextMenu(executable, enabled, label) {
  if (enabled) {
    await registerApplication(executable);
    for (const extension of EXTENSIONS) {
      const key = contextKey(extension);
      await setValue(key, '', label); await setValue(key, 'Icon', `"${executable}",0`);
      await setValue(`${key}\\command`, '', `"${executable}" "%1"`);
    }
  } else {
    for (const extension of EXTENSIONS) {
      try { await reg(['delete', contextKey(extension), '/f']); }
      catch (error) { if (error.code !== 1) throw error; }
    }
  }
  await setValue('HKCU\\Software\\Framecut', 'ContextMenuEnabled', enabled ? '1' : '0', 'REG_DWORD');
}
async function getContextMenuState() {
  try { await reg(['query', `${contextKey('mp4')}\\command`, '/ve']); return true; }
  catch { return false; }
}
function videoArgument(args) {
  return args.find(argument => typeof argument === 'string' && path.isAbsolute(argument) && EXTENSIONS.includes(path.extname(argument).slice(1).toLowerCase())) || null;
}
module.exports = { EXTENSIONS, registrationEntries, registerApplication, setContextMenu, getContextMenuState, videoArgument };
