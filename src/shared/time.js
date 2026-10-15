(function (root) {
  'use strict';
  function formatTime(seconds, milliseconds = false) {
    const value = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
    const totalMs = Math.round(value * 1000);
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor(totalMs / 60000) % 60;
    const secs = Math.floor(totalMs / 1000) % 60;
    const base = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    return milliseconds ? `${base}.${String(totalMs % 1000).padStart(3, '0')}` : base;
  }
  function parseTime(text) {
    const value = String(text).trim().replace(',', '.');
    if (!/^\d+(?::\d{1,2}){0,2}(?:\.\d{1,3})?$/.test(value)) return NaN;
    const parts = value.split(':').map(Number);
    if (parts.length > 1 && parts.slice(1).some(number => number >= 60)) return NaN;
    return parts.reduce((total, part) => total * 60 + part, 0);
  }
  function formatSize(bytes, language = 'en') {
    if (!bytes || !Number.isFinite(bytes)) return '0 B';
    const index = Math.min(3, Math.max(0, Math.floor(Math.log(bytes) / Math.log(1024))));
    return `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(bytes / 1024 ** index)} ${['B', 'KB', 'MB', 'GB'][index]}`;
  }
  const api = { formatTime, parseTime, formatSize };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FramecutTime = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
