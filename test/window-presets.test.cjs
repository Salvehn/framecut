'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fitWindow } = require('../src/window-presets.cjs');
test('window presets fit the available display and preserve maximized mode', () => {
  assert.equal(fitWindow('compact', { width: 1920, height: 1080 }).width, 960);
  assert.equal(fitWindow('standard', { width: 1920, height: 1080 }).height, 790);
  const small = fitWindow('large', { width: 1280, height: 720 });
  assert.equal(small.width, 1280); assert.equal(small.height, 720);
  assert.equal(fitWindow('maximized', { width: 1920, height: 1080 }).maximized, true);
  const almost = fitWindow('almost-maximized', { width: 1920, height: 1080 });
  assert.equal(almost.width, 1766); assert.equal(almost.height, 994); assert.equal(almost.maximized, false);
  const almostSmall = fitWindow('almost-maximized', { width: 1000, height: 700 });
  assert.equal(almostSmall.width, 960); assert.equal(almostSmall.height, 680);
  assert.equal(fitWindow('unknown', { width: 1920, height: 1080 }).width, 1180);
});
