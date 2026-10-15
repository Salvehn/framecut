(function (root) {
  'use strict';
  const clampToSelection = (time, start, end) => Math.max(start, Math.min(end, time));
  const loopsSelection = (start, end, duration, previewing = false) => previewing || start > 0 || end < duration;
  function playbackTime(time, { start, end, duration }, playing, previewing = false) {
    const lead = Math.min(0.015, (end - start) / 4);
    if (playing && loopsSelection(start, end, duration, previewing) && time >= end - lead) return start;
    return clampToSelection(time, start, end);
  }
  const api = { clampToSelection, loopsSelection, playbackTime };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FramecutPlayback = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
