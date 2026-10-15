'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { shareExportMode, cleanShares, RETENTION, executableFromCommand, openTarget } = require('../src/sharing.cjs');

test('sharing uses a compatible MP4 profile and preserves fast cutting when possible', () => {
  assert.equal(shareExportMode({ codec: 'h264', hasAudio: true, audioCodec: 'aac' }, 'copy'), 'copy');
  assert.equal(shareExportMode({ codec: 'h264', hasAudio: false }, 'copy'), 'copy');
  for (const info of [{ codec: 'vp9' }, { codec: 'h264', hasAudio: true, audioCodec: 'opus' }]) assert.equal(shareExportMode(info, 'copy'), 'precise');
  assert.equal(shareExportMode({ codec: 'h264' }, 'precise'), 'precise');
});
test('share cleanup removes only expired owned clips and keeps recent clips and other files', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'framecut-share-test-'));
  const old = path.join(directory, `clip-${randomUUID()}.mp4`), recent = path.join(directory, `clip-${randomUUID()}.mp4`);
  const foreign = path.join(directory, 'unrelated.mp4');
  try {
    for (const file of [old, recent, foreign]) await fs.writeFile(file, 'clip');
    const expired = new Date(Date.now() - RETENTION - 5000);
    await fs.utimes(old, expired, expired); await fs.utimes(foreign, expired, expired);
    await cleanShares(directory);
    await assert.rejects(fs.access(old)); await fs.access(recent); await fs.access(foreign);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
test('Telegram registration paths with spaces are parsed without executing command text', () => {
  assert.equal(executableFromCommand('    (Default)    REG_SZ    "C:\\Users\\Test Name\\Telegram.exe" -- "%1"'), 'C:\\Users\\Test Name\\Telegram.exe');
  assert.equal(executableFromCommand('invalid registration'), null);
});
test('sharing rejects unknown destinations before touching clipboard or external apps', async () => {
  await assert.rejects(openTarget('unknown', 'missing', {}), /Invalid sharing target/);
});
