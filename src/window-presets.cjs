'use strict';
const PRESETS = {
  compact: { width: 960, height: 680 },
  standard: { width: 1180, height: 790 },
  large: { width: 1440, height: 900 },
  maximized: { width: 1180, height: 790, maximized: true }
};
function fitWindow(preset, workArea) {
  const selected = PRESETS[preset] || PRESETS.standard;
  return { width: Math.min(selected.width, workArea.width), height: Math.min(selected.height, workArea.height),
    minWidth: Math.min(960, workArea.width), minHeight: Math.min(680, workArea.height), maximized: Boolean(selected.maximized) };
}
module.exports = { PRESETS, fitWindow };
