'use strict';
const { verify, createHash } = require('node:crypto');
const fs = require('node:fs');
const RELEASES = 'https://github.com/Salvehn/framecut/releases';
const MANIFEST_URL = `${RELEASES}/latest/download/framecut-update.json`;

function compareVersions(a, b) {
  if (![a, b].every(value => /^\d+\.\d+\.\d+$/.test(value))) throw new Error('Invalid version');
  const left = a.split('.').map(Number), right = b.split('.').map(Number);
  for (let index = 0; index < 3; index++) if (left[index] !== right[index]) return left[index] > right[index] ? 1 : -1;
  return 0;
}

function verifyManifest(envelope, publicKey) {
  if (typeof envelope?.payload !== 'string' || typeof envelope.signature !== 'string' || envelope.payload.length > 64000) throw new Error('Invalid update manifest');
  const bytes = Buffer.from(envelope.payload, 'base64');
  const signature = Buffer.from(envelope.signature, 'base64');
  if (signature.length !== 64 || !verify(null, bytes, publicKey, signature)) throw new Error('Invalid update signature');
  const manifest = JSON.parse(bytes.toString('utf8'));
  if (manifest.schema !== 1 || !/^\d+\.\d+\.\d+$/.test(manifest.version)) throw new Error('Unsupported update manifest');
  const installer = manifest.installer;
  const name = `Framecut-${manifest.version}-x64-nsis.exe`;
  const expectedUrl = `${RELEASES}/download/v${manifest.version}/${name}`;
  if (installer?.name !== name || installer.url !== expectedUrl || !/^[a-f0-9]{64}$/.test(installer.sha256) ||
      !Number.isSafeInteger(installer.size) || installer.size <= 0 || installer.size > 2 * 1024 ** 3) throw new Error('Invalid update artifact');
  return manifest;
}

async function verifyFile(filePath, artifact) {
  const stat = await fs.promises.stat(filePath);
  if (stat.size !== artifact.size) throw new Error('Update size mismatch');
  const hash = createHash('sha256');
  for await (const chunk of fs.createReadStream(filePath)) hash.update(chunk);
  if (hash.digest('hex') !== artifact.sha256) throw new Error('Update checksum mismatch');
}

module.exports = { RELEASES, MANIFEST_URL, compareVersions, verifyManifest, verifyFile };
