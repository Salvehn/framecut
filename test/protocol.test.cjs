'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { serveMedia } = require('../src/media-protocol.cjs');

test('serves explicit and suffix byte ranges so seeking works in large videos', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'framecut-range-'));
  const filePath = path.join(directory, 'video.mp4'); await fs.writeFile(filePath, '0123456789');
  const files = new Map([['safe-id', filePath]]);
  const request = range => new Request('framecut-media://local/safe-id', { headers: range ? { range } : {} });
  try {
    const full = await serveMedia(request(), files); assert.equal(full.status, 200); assert.equal(await full.text(), '0123456789');
    const partial = await serveMedia(request('bytes=2-5'), files); assert.equal(partial.status, 206);
    assert.equal(partial.headers.get('content-range'), 'bytes 2-5/10'); assert.equal(await partial.text(), '2345');
    const suffix = await serveMedia(request('bytes=-3'), files); assert.equal(await suffix.text(), '789');
    assert.equal((await serveMedia(request('bytes=100-'), files)).status, 416);
    assert.equal((await serveMedia(new Request('framecut-media://local/../../secret'), files)).status, 404);
    const head = await serveMedia(new Request('framecut-media://local/safe-id', { method: 'HEAD' }), files);
    assert.equal(head.headers.get('content-length'), '10'); assert.equal(await head.text(), '');
  } finally { await fs.rm(directory, { recursive: true, force: true }); }
});
