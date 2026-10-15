'use strict';
const PRESETS = {
  compact: { width: 960, height: 680 },
  standard: { width: 1180, height: 790 },
  large: { width: 1440, height: 900 },
  'almost-maximized': { scale: 0.92 },
  maximized: { width: 1180, height: 790, maximized: true }
};
function fitWindow(preset, workArea) {
  const selected = PRESETS[preset] || PRESETS.standard;
  const minWidth = Math.min(960, workArea.width), minHeight = Math.min(680, workArea.height);
  const width = selected.scale ? Math.max(minWidth, Math.round(workArea.width * selected.scale)) : selected.width;
  const height = selected.scale ? Math.max(minHeight, Math.round(workArea.height * selected.scale)) : selected.height;
  return { width: Math.min(width, workArea.width), height: Math.min(height, workArea.height),
    minWidth, minHeight, maximized: Boolean(selected.maximized) };
}
module.exports = { PRESETS, fitWindow };
