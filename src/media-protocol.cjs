'use strict';
const fs = require('node:fs');
const { Readable } = require('node:stream');
const path = require('node:path');

async function serveMedia(request, files) {
  const url = new URL(request.url);
  const filePath = files.get(url.pathname.slice(1));
  if (url.hostname !== 'local' || !filePath || !['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 404 });
  try {
    const stat = await fs.promises.stat(filePath);
    let start = 0, end = stat.size - 1, status = 200;
    const range = request.headers.get('range');
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
      if (!match[1]) start = Math.max(0, stat.size - Number(match[2]));
      else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
      if (start > end || start >= stat.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } });
      status = 206;
    }
    const types = { '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/mp4', '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.ogv': 'video/ogg' };
    const headers = { 'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' };
    if (status === 206) headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
    const body = request.method === 'HEAD' ? null : Readable.toWeb(fs.createReadStream(filePath, { start, end }));
    return new Response(body, { status, headers });
  } catch { return new Response(null, { status: 404 }); }
}
module.exports = { serveMedia };
