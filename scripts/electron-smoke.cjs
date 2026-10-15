'use strict';
const { app } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

module.exports = async ({ window, openMedia, tools }) => {
  const directory = path.join(__dirname, '..', 'test-artifacts');
  const evaluate = expression => window.webContents.executeJavaScript(expression);
  const waitFor = async (expression, timeout = 15000) => {
    const started = Date.now();
    while (Date.now() - started < timeout) {
      if (await evaluate(expression)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out waiting for ${expression}`);
  };
  try {
    await new Promise(resolve => window.webContents.once('did-finish-load', resolve));
    await waitFor('state.initialized');
    if (!window.isVisible()) await new Promise(resolve => window.once('ready-to-show', resolve));
    await new Promise(resolve => setTimeout(resolve, 500));
    const errors = [];
    window.webContents.on('console-message', (_event, details) => { if (details.level === 'error') errors.push(details.message); });
    await evaluate("applyLanguage('ru')");
    await new Promise(resolve => setTimeout(resolve, 150));
    await fs.writeFile(path.join(__dirname, '..', 'assets', 'screenshot.png'), (await window.webContents.capturePage()).toPNG());
    for (const language of ['ru', 'en', 'de', 'es']) {
      const result = await evaluate(`(async () => {
        document.getElementById('language').value = '${language}';
        document.getElementById('language').dispatchEvent(new Event('change'));
        await new Promise(resolve => setTimeout(resolve, 150));
        return { lang: document.documentElement.lang, text: document.getElementById('open-top').textContent.trim(),
          bridge: (await framecut.bootstrap()).value.language,
          overflow: document.documentElement.scrollWidth > innerWidth };
      })()`);
      assert.equal(result.lang, language); assert.equal(result.bridge, language); assert.equal(result.overflow, false);
      console.log(`PASS language ${language}: ${result.text}`);
    }
    await evaluate("applyLanguage('ru')");
    const data = await openMedia(path.join(directory, 'sample.mp4'));
    await evaluate(`(async () => { await useMedia(${JSON.stringify(data)}); setBusy(false); })()`);
    await waitFor('video.readyState >= 2 && !state.busy');
    const dimensions = await evaluate('({ width: video.videoWidth, height: video.videoHeight, disabled: document.getElementById("export").disabled })');
    assert.equal(dimensions.width, 960); assert.equal(dimensions.height, 540); assert.equal(dimensions.disabled, false);
    await evaluate('seek(2);');
    await waitFor('Math.abs(video.currentTime - 2) < 0.1 && !video.seeking');
    await evaluate('video.play()');
    await waitFor('video.currentTime > 2.2');
    await evaluate('video.pause(); changeBoundary("start", 1.25); changeBoundary("end", 4.75)');
    const selection = await evaluate('({ start: state.start, end: state.end, text: document.getElementById("clip-duration").textContent })');
    assert.equal(selection.start, 1.25); assert.equal(selection.end, 4.75); assert.equal(selection.text, '00:00:03.500');
    await evaluate('document.getElementById("preview").click()');
    await waitFor('!state.previewing && video.paused', 10000);
    assert.ok(Math.abs(await evaluate('video.currentTime') - 4.75) < 0.15);
    await waitFor('document.getElementById("filmstrip").children.length >= 8');
    const result = await require('../src/media.cjs').exportClip({ input: path.join(directory, 'sample.mp4'), output: path.join(directory, 'export.mp4'),
      start: 1.25, end: 4.75, totalDuration: 8, mode: 'precise', tools });
    assert.ok(Math.abs(result.duration - 3.5) < 0.08); assert.equal(result.hasAudio, true);
    await fs.writeFile(path.join(directory, 'loaded.png'), (await window.webContents.capturePage()).toPNG());
    assert.deepEqual(errors, []);
    console.log('PASS playback, seek, thumbnails, selection, clip preview, precise export and audio');
    await fs.writeFile(path.join(directory, 'smoke-result.json'), JSON.stringify({ ok: true, languages: ['ru', 'en', 'de', 'es'], duration: result.duration, hasAudio: result.hasAudio }, null, 2));
    app.quit();
  } catch (error) {
    console.error('SMOKE FAILED:', error);
    await fs.writeFile(path.join(directory, 'smoke-result.json'), JSON.stringify({ ok: false, error: error.message }, null, 2));
    app.exit(1);
  }
};
