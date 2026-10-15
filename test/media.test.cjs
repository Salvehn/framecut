'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const media = require('../src/media.cjs');
const tools = media.toolPaths();
let directory, source, sourceHash;

before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), 'framecut-test-'));
  source = path.join(directory, 'Тестовое видео with spaces.mp4');
  await media.runTool(tools.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=320x180:rate=30:duration=6',
    '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=6', '-c:v', 'libx264', '-preset', 'ultrafast',
    '-g', '60', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', source]);
  sourceHash = createHash('sha256').update(await fs.readFile(source)).digest('hex');
});
after(async () => { if (directory) await fs.rm(directory, { recursive: true, force: true }); });

test('reads video metadata from Unicode filenames', async () => {
  const info = await media.probe(source, tools);
  assert.equal(info.width, 320); assert.equal(info.height, 180); assert.equal(info.fps, 30);
  assert.equal(info.hasAudio, true); assert.equal(info.codec, 'h264');
  assert.ok(Math.abs(info.duration - 6) < 0.1);
});
test('precise cut exports the selected duration and audio', async () => {
  const output = path.join(directory, 'точный фрагмент.mp4');
  const progress = [];
  const result = await media.exportClip({ input: source, output, start: 1.25, end: 3.75, totalDuration: 6, mode: 'precise', tools, onProgress: p => progress.push(p) });
  assert.ok(Math.abs(result.duration - 2.5) < 0.08, `duration ${result.duration}`);
  assert.equal(result.hasAudio, true); assert.equal(result.codec, 'h264');
  assert.equal(progress.at(-1), 1); assert.ok(result.size > 1000);
  assert.equal(createHash('sha256').update(await fs.readFile(source)).digest('hex'), sourceHash);
});
test('fast cut retains video and audio codecs', async () => {
  const output = path.join(directory, 'fast.mkv');
  const result = await media.exportClip({ input: source, output, start: 2, end: 4, totalDuration: 6, mode: 'copy', tools });
  assert.equal(result.codec, 'h264'); assert.equal(result.audioCodec, 'aac'); assert.ok(result.size > 1000);
});
test('does not overwrite an original, including case-insensitive Windows paths', async () => {
  await assert.rejects(media.exportClip({ input: source, output: source, start: 0, end: 2, totalDuration: 6, mode: 'precise', tools }), { code: 'SOURCE_OVERWRITE' });
  if (process.platform === 'win32') assert.equal(await media.sameFile(source, source.toUpperCase()), true);
  assert.equal(createHash('sha256').update(await fs.readFile(source)).digest('hex'), sourceHash);
});
test('failed export preserves an existing destination and cleans up temporary files', async () => {
  const output = path.join(directory, 'existing.mp4');
  await fs.writeFile(output, 'keep this existing file');
  await assert.rejects(media.exportClip({ input: source, output, start: 0, end: 2, totalDuration: 6, mode: 'unknown', tools }), { code: 'INVALID_MODE' });
  assert.equal(await fs.readFile(output, 'utf8'), 'keep this existing file');
  assert.equal((await fs.readdir(directory)).filter(name => name.startsWith('.framecut-')).length, 0);
});
test('cancellation stops FFmpeg and leaves no partial output', async () => {
  const controller = new AbortController();
  const output = path.join(directory, 'cancelled.mp4');
  const promise = media.exportClip({ input: source, output, start: 0, end: 6, totalDuration: 6, mode: 'precise', tools, signal: controller.signal });
  controller.abort();
  await assert.rejects(promise, { code: 'CANCELLED' });
  await assert.rejects(fs.stat(output), { code: 'ENOENT' });
  assert.equal((await fs.readdir(directory)).filter(name => name.startsWith('.framecut-')).length, 0);
});
test('cancels a running media process promptly', async () => {
  const controller = new AbortController();
  const started = Date.now();
  const promise = media.runTool(tools.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-re', '-i', source, '-f', 'null', '-'], { signal: controller.signal });
  const timer = setTimeout(() => controller.abort(), 150);
  try { await assert.rejects(promise, { code: 'CANCELLED' }); }
  finally { clearTimeout(timer); }
  assert.ok(Date.now() - started < 2500);
});
test('a video without audio exports correctly', async () => {
  const silent = path.join(directory, 'silent.mp4');
  await media.runTool(tools.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', source, '-an', '-c:v', 'copy', silent]);
  const result = await media.exportClip({ input: silent, output: path.join(directory, 'silent-clip.mp4'), start: 1, end: 2, totalDuration: 6, mode: 'precise', tools });
  assert.equal(result.hasAudio, false); assert.ok(Math.abs(result.duration - 1) < 0.08);
});
test('converts an unsupported preview and retains sound', async () => {
  const incompatible = path.join(directory, 'legacy.avi');
  await media.runTool(tools.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-i', source, '-c:v', 'mpeg4', '-c:a', 'mp3', incompatible]);
  const info = await media.probe(incompatible, tools);
  assert.equal(media.nativePreviewSupported(incompatible, info), false);
  const preview = path.join(directory, 'preview.mp4');
  await media.createPreview(incompatible, preview, tools, { duration: info.duration });
  const converted = await media.probe(preview, tools);
  assert.equal(converted.codec, 'h264'); assert.equal(converted.audioCodec, 'aac');
});
test('rejects corrupt input', async () => {
  const corrupt = path.join(directory, 'corrupt.mp4'); await fs.writeFile(corrupt, 'not a video');
  await assert.rejects(media.probe(corrupt, tools));
});
test('range validation rejects invalid and malicious values', () => {
  for (const values of [[-1, 2, 6], [2, 1, 6], [0, 7, 6], [0, 0.01, 6], [NaN, 2, 6], ['0', 2, 6], [0, Infinity, 6]]) {
    assert.throws(() => media.validateRange(...values), { code: 'INVALID_RANGE' });
  }
  assert.deepEqual(media.validateRange(1.25, 3.75, 6), { start: 1.25, end: 3.75, duration: 2.5 });
});
