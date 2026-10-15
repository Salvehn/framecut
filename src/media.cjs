'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const MIN_CLIP = 0.04;

function toolPaths(packaged = false, resourcesPath = '') {
  return packaged
    ? { ffmpeg: path.join(resourcesPath, 'tools', 'ffmpeg.exe'), ffprobe: path.join(resourcesPath, 'tools', 'ffprobe.exe') }
    : { ffmpeg: require('ffmpeg-static'), ffprobe: require('ffprobe-static').path };
}

function runTool(executable, args, { signal, onProgress, timeout = 0 } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(Object.assign(new Error('Cancelled'), { code: 'CANCELLED' }));
    const child = spawn(executable, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let progressBuffer = '';
    let timedOut = false;
    const cancel = () => child.kill();
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = timeout ? setTimeout(() => { timedOut = true; child.kill(); }, timeout) : null;
    const cleanup = () => { clearTimeout(timer); signal?.removeEventListener('abort', cancel); };
    child.stdout.on('data', chunk => {
      const text = chunk.toString();
      if (onProgress) {
        progressBuffer += text;
        const lines = progressBuffer.split(/\r?\n/);
        progressBuffer = lines.pop();
        for (const line of lines) {
          const match = /^out_time_us=(\d+)$/.exec(line);
          if (match) onProgress(Number(match[1]) / 1e6);
        }
      } else {
        stdout += text;
        if (stdout.length > 8 * 1024 * 1024) child.kill();
      }
    });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk.toString()).slice(-24000); });
    child.once('error', error => { cleanup(); reject(error); });
    child.once('close', code => {
      cleanup();
      if (signal?.aborted) reject(Object.assign(new Error('Cancelled'), { code: 'CANCELLED' }));
      else if (timedOut) reject(Object.assign(new Error('Media operation timed out'), { code: 'TIMEOUT' }));
      else if (code !== 0) reject(Object.assign(new Error(stderr.trim() || `Media process exited with ${code}`), { code: 'MEDIA_ERROR' }));
      else resolve(stdout);
    });
  });
}

async function probe(filePath, tools, options = {}) {
  const raw = await runTool(tools.ffprobe, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', filePath], { timeout: 30000, ...options });
  const data = JSON.parse(raw);
  const video = data.streams?.find(stream => stream.codec_type === 'video' && !stream.disposition?.attached_pic);
  if (!video) throw Object.assign(new Error('No video stream'), { code: 'NO_VIDEO' });
  const duration = Number(data.format?.duration || video.duration);
  if (!Number.isFinite(duration) || duration < MIN_CLIP) throw Object.assign(new Error('Invalid video duration'), { code: 'NO_DURATION' });
  const [numerator, denominator] = (video.avg_frame_rate || video.r_frame_rate || '0/1').split('/').map(Number);
  return {
    duration, width: video.width || 0, height: video.height || 0,
    fps: denominator ? numerator / denominator : 0, codec: video.codec_name || '',
    audioCodec: data.streams?.find(stream => stream.codec_type === 'audio')?.codec_name || '',
    hasAudio: data.streams?.some(stream => stream.codec_type === 'audio') || false,
    size: Number(data.format?.size) || (await fs.stat(filePath)).size,
    format: data.format?.format_name || ''
  };
}

function validateRange(start, end, duration) {
  if (![start, end, duration].every(value => typeof value === 'number' && Number.isFinite(value)) ||
      start < 0 || end > duration + 0.001 || end - start < MIN_CLIP) {
    throw Object.assign(new Error('Invalid clip range'), { code: 'INVALID_RANGE' });
  }
  return { start, end: Math.min(end, duration), duration: Math.min(end, duration) - start };
}

function exportArgs(input, output, start, duration, mode) {
  const args = ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-ss', start.toFixed(6), '-i', input,
    '-t', duration.toFixed(6), '-map', '0:v:0', '-map', '0:a?', '-sn', '-dn'];
  if (mode === 'copy') {
    args.push('-c', 'copy', '-avoid_negative_ts', 'make_zero');
  } else if (mode === 'precise') {
    const extension = path.extname(output).toLowerCase();
    const profile = {
      '.webm': ['-c:v', 'libvpx-vp9', '-crf', '28', '-b:v', '0', '-cpu-used', '3', '-row-mt', '1', '-c:a', 'libopus', '-b:a', '160k'],
      '.avi': ['-c:v', 'mpeg4', '-q:v', '2', '-c:a', 'libmp3lame', '-b:a', '192k'],
      '.wmv': ['-c:v', 'wmv2', '-q:v', '2', '-c:a', 'wmav2', '-b:a', '192k'],
      '.ogv': ['-c:v', 'libtheora', '-q:v', '7', '-c:a', 'libvorbis', '-q:a', '5'],
      '.mpg': ['-c:v', 'mpeg2video', '-q:v', '2', '-c:a', 'mp2', '-b:a', '192k'],
      '.mpeg': ['-c:v', 'mpeg2video', '-q:v', '2', '-c:a', 'mp2', '-b:a', '192k']
    }[extension] || ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-c:a', 'aac', '-b:a', '192k'];
    args.push(...profile, '-pix_fmt', 'yuv420p', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2');
    if (['.mp4', '.mov', '.m4v', '.3gp'].includes(extension)) args.push('-movflags', '+faststart');
    if (['.ts', '.mts', '.m2ts'].includes(extension)) args.push('-f', 'mpegts');
  } else {
    throw Object.assign(new Error('Unknown export mode'), { code: 'INVALID_MODE' });
  }
  return [...args, '-progress', 'pipe:1', '-nostats', output];
}

async function sameFile(left, right) {
  const normalized = filePath => process.platform === 'win32' ? path.resolve(filePath).toLowerCase() : path.resolve(filePath);
  if (normalized(left) === normalized(right)) return true;
  try {
    const [a, b] = await Promise.all([fs.stat(left), fs.stat(right)]);
    return a.dev === b.dev && a.ino === b.ino;
  } catch { return false; }
}

async function exportClip({ input, output, start, end, totalDuration, mode = 'precise', overwrite = false, beforeReplace, tools, signal, onProgress }) {
  const range = validateRange(start, end, totalDuration);
  const isSource = await sameFile(input, output);
  if (isSource && !overwrite) throw Object.assign(new Error('Cannot overwrite source in new-file mode'), { code: 'SOURCE_OVERWRITE' });
  if (overwrite && !isSource) throw Object.assign(new Error('Overwrite destination must be the source'), { code: 'SOURCE_OVERWRITE' });
  const temporary = path.join(path.dirname(output), `.framecut-${randomUUID()}${path.extname(output)}`);
  try {
    await runTool(tools.ffmpeg, exportArgs(input, temporary, range.start, range.duration, mode), {
      signal, onProgress: seconds => onProgress?.(Math.min(0.99, Math.max(0, seconds / range.duration)))
    });
    if (signal?.aborted) throw Object.assign(new Error('Cancelled'), { code: 'CANCELLED' });
    const result = await probe(temporary, tools, { signal });
    if (result.size === 0) throw new Error('Export is empty');
    if (beforeReplace) await beforeReplace();
    if (signal?.aborted) throw Object.assign(new Error('Cancelled'), { code: 'CANCELLED' });
    await fs.rename(temporary, output);
    onProgress?.(1);
    return { output, ...result };
  } finally {
    await fs.rm(temporary, { force: true }).catch(() => {});
  }
}

async function createPreview(input, output, tools, { signal, duration, onProgress } = {}) {
  try {
    await runTool(tools.ffmpeg, ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', input,
      '-map', '0:v:0', '-map', '0:a:0?', '-sn', '-dn', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
      '-vf', "scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
      '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart',
      '-progress', 'pipe:1', '-nostats', output], {
      signal, onProgress: seconds => onProgress?.(Math.min(0.99, seconds / duration))
    });
    return output;
  } catch (error) {
    await fs.rm(output, { force: true }).catch(() => {});
    throw error;
  }
}

function nativePreviewSupported(filePath, info) {
  const extension = path.extname(filePath).toLowerCase();
  return ['.mp4', '.m4v', '.mov', '.webm', '.mkv', '.ogv'].includes(extension) &&
    ['h264', 'vp8', 'vp9', 'av1', 'theora'].includes(info.codec) &&
    (!info.audioCodec || ['aac', 'mp3', 'opus', 'vorbis', 'flac', 'pcm_s16le'].includes(info.audioCodec));
}

module.exports = { MIN_CLIP, toolPaths, runTool, probe, validateRange, exportArgs, exportClip, sameFile, createPreview, nativePreviewSupported };
