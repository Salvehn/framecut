'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const media = require('../src/media.cjs');
const sharing = require('../src/sharing.cjs');
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

test('sharing prepares a temporary MP4 with audio and preserves the source', async () => {
  const clip = await sharing.prepareShare({ directory: path.join(directory, 'share-cache'), input: source,
    info: await media.probe(source, tools), start: 1.25, end: 3.75, mode: 'precise', tools, exportClip: media.exportClip });
  const result = await media.probe(clip.path, tools);
  assert.equal(path.extname(clip.path), '.mp4'); assert.equal(result.codec, 'h264'); assert.equal(result.audioCodec, 'aac');
  assert.ok(Math.abs(result.duration - 2.5) < 0.08); assert.ok(clip.size > 1000);
  assert.equal(createHash('sha256').update(await fs.readFile(source)).digest('hex'), sourceHash);
});
test('fast cut retains video and audio codecs', async () => {
  const output = path.join(directory, 'fast.mkv');
  const result = await media.exportClip({ input: source, output, start: 2, end: 4, totalDuration: 6, mode: 'copy', tools });
  assert.equal(result.codec, 'h264'); assert.equal(result.audioCodec, 'aac'); assert.ok(result.size > 1000);
});

test('export bakes every playback speed into the selected video and audio, including fast mode', async () => {
  for (const speed of [0.25, 0.5, 0.75, 1.25, 1.5, 2, 3]) {
    const output = path.join(directory, `speed-${speed}.mp4`);
    const result = await media.exportClip({ input: source, output, start: 1.25, end: 3.75, totalDuration: 6, mode: 'copy', speed, tools });
    const expected = 2.5 / speed;
    assert.ok(Math.abs(result.duration - expected) < 0.1, `${speed}×: duration ${result.duration}, expected ${expected}`);
    assert.equal(result.codec, 'h264'); assert.equal(result.audioCodec, 'aac');
    const data = JSON.parse(await media.runTool(tools.ffprobe, ['-v', 'error', '-show_streams', '-of', 'json', output]));
    const video = data.streams.find(stream => stream.codec_type === 'video');
    const audio = data.streams.find(stream => stream.codec_type === 'audio');
    assert.ok(Math.abs(Number(video.duration) - Number(audio.duration)) < 0.1, `${speed}×: video/audio duration mismatch`);
    // The 440 Hz fixture should retain its pitch after both slow and fast exports.
    const decoded = path.join(directory, `speed-${speed}.pcm`);
    await media.runTool(tools.ffmpeg, ['-v', 'error', '-y', '-i', output, '-map', '0:a:0', '-ac', '1', '-ar', '48000', '-f', 's16le', decoded]);
    const pcm = await fs.readFile(decoded);
    const from = Math.floor(48000 * 0.1), to = Math.min(pcm.length / 2, Math.floor(48000 * (expected - 0.1)));
    let crossings = 0;
    for (let sample = from + 1; sample < to; sample++) if (pcm.readInt16LE((sample - 1) * 2) <= 0 && pcm.readInt16LE(sample * 2) > 0) crossings++;
    const frequency = crossings * 48000 / (to - from);
    assert.ok(Math.abs(frequency - 440) < 5, `${speed}×: pitch ${frequency} Hz`);
  }
  assert.equal(createHash('sha256').update(await fs.readFile(source)).digest('hex'), sourceHash);
});

test('sharing exports the current speed rather than only the playback preview', async () => {
  const clip = await sharing.prepareShare({ directory: path.join(directory, 'speed-share'), input: source,
    info: await media.probe(source, tools), start: 1.25, end: 4.25, mode: 'copy', speed: 2, tools, exportClip: media.exportClip });
  assert.ok(Math.abs(clip.duration - 1.5) < 0.08);
  assert.equal((await media.probe(clip.path, tools)).hasAudio, true);
});

test('speed exports stay inside the selected source segment and support very short results', async () => {
  const marked = path.join(directory, 'marked.mp4');
  // Only the selected second is white; any black exported frame escaped the selection.
  await media.runTool(tools.ffmpeg, ['-v', 'error', '-f', 'lavfi', '-i', 'color=black:size=64x64:rate=30:duration=4',
    '-vf', "drawbox=color=white:t=fill:enable='gte(t,1)*lt(t,2)'", '-c:v', 'libx264', '-preset', 'ultrafast', marked]);
  for (const speed of [0.5, 2]) {
    const output = path.join(directory, `marked-speed-${speed}.mp4`);
    await media.exportClip({ input: marked, output, start: 1, end: 2, totalDuration: 4, mode: 'copy', speed, tools });
    const levels = await media.runTool(tools.ffmpeg, ['-v', 'error', '-i', output, '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-']);
    const luminance = [...levels.matchAll(/lavfi\.signalstats\.YAVG=(\d+(?:\.\d+)?)/g)].map(match => Number(match[1]));
    assert.ok(luminance.length > 0 && luminance.every(value => value > 220), `${speed}× escaped the selected white segment`);
  }
  const tiny = await media.exportClip({ input: source, output: path.join(directory, 'tiny-speed.mp4'),
    start: 0, end: .04, totalDuration: 6, mode: 'copy', speed: 3, tools });
  assert.ok(tiny.duration > 0 && tiny.duration < .1);
});

test('invalid export speeds cannot overwrite a source or destination', async () => {
  for (const speed of [0, -1, 0.1, 4, NaN, Infinity, '2', null, {}]) {
    await assert.rejects(media.exportClip({ input: source, output: source, overwrite: true,
      start: 0, end: 2, totalDuration: 6, speed, tools }), { code: 'INVALID_SPEED' });
  }
  assert.equal(createHash('sha256').update(await fs.readFile(source)).digest('hex'), sourceHash);
});
test('explicit overwrite atomically replaces only the source with a verified clip', async () => {
  const overwriteSource = path.join(directory, 'overwrite source.mp4');
  await fs.copyFile(source, overwriteSource);
  let prepared = false;
  const result = await media.exportClip({ input: overwriteSource, output: overwriteSource,
    start: 1.25, end: 2.75, totalDuration: 6, mode: 'precise', overwrite: true, tools,
    beforeReplace: async () => { prepared = true; assert.ok(Math.abs((await media.probe(overwriteSource, tools)).duration - 6) < 0.1); } });
  assert.equal(prepared, true); assert.ok(Math.abs(result.duration - 1.5) < 0.08);
  assert.ok(Math.abs((await media.probe(overwriteSource, tools)).duration - 1.5) < 0.08);
});
test('failure just before overwrite preserves the entire original', async () => {
  const overwriteSource = path.join(directory, 'failed overwrite.mp4'); await fs.copyFile(source, overwriteSource);
  await assert.rejects(media.exportClip({ input: overwriteSource, output: overwriteSource,
    start: 1, end: 2, totalDuration: 6, mode: 'precise', overwrite: true, tools,
    beforeReplace: async () => { throw new Error('Simulated file lock'); } }), /file lock/);
  assert.equal(createHash('sha256').update(await fs.readFile(overwriteSource)).digest('hex'), sourceHash);
  assert.equal((await fs.readdir(directory)).filter(name => name.startsWith('.framecut-')).length, 0);
});
test('precise overwrite uses compatible codecs for WebM', async () => {
  const output = path.join(directory, 'compatible.webm');
  const result = await media.exportClip({ input: source, output, start: 1, end: 1.5, totalDuration: 6, mode: 'precise', tools });
  assert.equal(result.codec, 'vp9'); assert.equal(result.audioCodec, 'opus');
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
  const retimed = await media.exportClip({ input: silent, output: path.join(directory, 'silent-speed.mp4'), start: 1, end: 2, totalDuration: 6, mode: 'copy', speed: 0.5, tools });
  assert.equal(retimed.hasAudio, false); assert.ok(Math.abs(retimed.duration - 2) < 0.08);
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
