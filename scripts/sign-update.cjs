'use strict';
const { createHash, sign } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { verifyManifest, RELEASES } = require('../src/update-core.cjs');
const version = require('../package.json').version;
if (process.env.GITHUB_REF_TYPE === 'tag' && process.env.GITHUB_REF_NAME !== `v${version}`) throw new Error('Release tag must match package.json version');
const name = `Framecut-${version}-x64-nsis.exe`;
const filePath = path.join(__dirname, '..', 'dist', name);
const privateKey = process.env.FRAMECUT_UPDATE_PRIVATE_KEY ||
  (process.env.FRAMECUT_UPDATE_KEY_FILE ? fs.readFileSync(process.env.FRAMECUT_UPDATE_KEY_FILE, 'utf8') : null);
if (!privateKey) throw new Error('Set FRAMECUT_UPDATE_PRIVATE_KEY or FRAMECUT_UPDATE_KEY_FILE. Never commit the private key.');
const file = fs.readFileSync(filePath);
const payload = Buffer.from(JSON.stringify({ schema: 1, version, installer: {
  name, url: `${RELEASES}/download/v${version}/${name}`, size: file.length,
  sha256: createHash('sha256').update(file).digest('hex')
} }));
const envelope = { payload: payload.toString('base64'), signature: sign(null, payload, privateKey).toString('base64') };
verifyManifest(envelope, fs.readFileSync(path.join(__dirname, '..', 'assets', 'update-public.pem'), 'utf8'));
fs.writeFileSync(path.join(__dirname, '..', 'dist', 'framecut-update.json'), JSON.stringify(envelope, null, 2));
console.log(`Signed update manifest for ${version}`);
