'use strict';
const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const media = require('../src/media.cjs');

(async () => {
  const testDirectory = path.join(__dirname, '..', 'test-artifacts');
  await fs.mkdir(testDirectory, { recursive: true });
  const tools = media.toolPaths();
  await media.runTool(tools.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=960x540:rate=30:duration=8',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=8', '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
    path.join(testDirectory, 'sample.mp4')]);
  const child = spawn(require('electron'), ['.', '--smoke-test'], {
    cwd: path.join(__dirname, '..'), stdio: 'inherit', windowsHide: true,
    env: { ...process.env, FRAMECUT_TEST_DIR: path.join(testDirectory, `profile-${Date.now()}`) }
  });
  const timer = setTimeout(() => { child.kill(); console.error('Smoke test timed out'); process.exitCode = 1; }, 90000);
  child.on('error', error => { clearTimeout(timer); console.error(error); process.exitCode = 1; });
  child.on('exit', code => { clearTimeout(timer); process.exitCode = code || 0; });
})().catch(error => { console.error(error); process.exitCode = 1; });
