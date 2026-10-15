'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { EXTENSIONS, registrationEntries, videoArgument } = require('../src/windows-integration.cjs');

test('registers supported types per user without changing existing defaults', () => {
  const entries = registrationEntries('C:\\Program Files\\Framecut\\Framecut.exe');
  assert.ok(entries.every(([key]) => key.startsWith('HKCU\\')));
  assert.ok(entries.every(([key]) => !key.includes('UserChoice')));
  assert.ok(!entries.some(([key, name]) => /^HKCU\\Software\\Classes\\\.\w+$/.test(key) && name === ''));
  for (const extension of EXTENSIONS) assert.ok(entries.some(([key, name, value]) => key.endsWith('Capabilities\\FileAssociations') && name === `.${extension}` && value === 'Framecut.Video'));
});
test('quotes executable and selected file arguments for Explorer', () => {
  const executable = 'C:\\Program Files\\Framecut\\Framecut.exe';
  const entries = registrationEntries(executable);
  assert.equal(entries.find(([key]) => key.endsWith('Framecut.Video\\shell\\open\\command'))[2], `"${executable}" "%1"`);
  assert.throws(() => registrationEntries('relative.exe'));
  assert.throws(() => registrationEntries('C:\\bad"name.exe'));
});
test('accepts video file arguments and ignores flags and executable paths', () => {
  const video = path.resolve('a video.MP4');
  assert.equal(videoArgument(['Framecut.exe', '--user-data-dir=C:\\temp', video]), video);
  assert.equal(videoArgument(['C:\\Windows\\notepad.exe', '--smoke-test']), null);
});
