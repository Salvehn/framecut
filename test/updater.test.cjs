'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { generateKeyPairSync, sign, createHash } = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { compareVersions, verifyManifest, verifyFile, RELEASES } = require('../src/update-core.cjs');
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const manifest = { schema: 1, version: '1.2.3', installer: { name: 'Framecut-1.2.3-x64-nsis.exe',
  url: `${RELEASES}/download/v1.2.3/Framecut-1.2.3-x64-nsis.exe`, size: 1024, sha256: 'a'.repeat(64) } };
function envelope(data, key = privateKey) {
  const payload = Buffer.from(JSON.stringify(data));
  return { payload: payload.toString('base64'), signature: sign(null, payload, key).toString('base64') };
}
test('accepts an Ed25519-signed manifest from the trusted release key', () => assert.deepEqual(verifyManifest(envelope(manifest), publicKey), manifest));
test('rejects a tampered update manifest', () => {
  const signed = envelope(manifest); signed.payload = Buffer.from(JSON.stringify({ ...manifest, version: '9.0.0' })).toString('base64');
  assert.throws(() => verifyManifest(signed, publicKey), /signature/);
});
test('rejects a manifest signed by a different key', () => {
  const foreign = generateKeyPairSync('ed25519');
  assert.throws(() => verifyManifest(envelope(manifest, foreign.privateKey), publicKey), /signature/);
});
test('rejects unsigned manifests, wrong artifact URLs and unbounded sizes', () => {
  assert.throws(() => verifyManifest({ payload: 'e30=', signature: '' }, publicKey));
  for (const change of [{ url: 'https://example.com/malware.exe' }, { size: 3 * 1024 ** 3 }, { sha256: 'invalid' }, { name: '../../x.exe' }]) {
    assert.throws(() => verifyManifest(envelope({ ...manifest, installer: { ...manifest.installer, ...change } }), publicKey));
  }
});
test('compares version numbers numerically and rejects malformed versions', () => {
  assert.equal(compareVersions('1.10.0', '1.9.9'), 1); assert.equal(compareVersions('1.0.0', '1.0.0'), 0);
  assert.equal(compareVersions('1.0.0', '2.0.0'), -1); assert.throws(() => compareVersions('1.2.3-beta', '1.2.3'));
});
test('verifies downloaded size and checksum, including corruption', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'framecut-update-test-'));
  const filePath = path.join(directory, 'update.exe'); const content = Buffer.from('test update binary');
  const artifact = { size: content.length, sha256: createHash('sha256').update(content).digest('hex') };
  try {
    await fs.writeFile(filePath, content); await verifyFile(filePath, artifact);
    await assert.rejects(verifyFile(filePath, { ...artifact, size: 1 }), /size mismatch/);
    await fs.writeFile(filePath, Buffer.alloc(content.length)); await assert.rejects(verifyFile(filePath, artifact), /checksum mismatch/);
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
