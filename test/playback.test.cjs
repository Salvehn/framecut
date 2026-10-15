'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { clampToSelection, loopsSelection, playbackTime } = require('../src/shared/playback.js');

test('seeking and frame steps remain within both selection boundaries', () => {
  assert.equal(clampToSelection(-5, 1.25, 4.75), 1.25);
  assert.equal(clampToSelection(30, 1.25, 4.75), 4.75);
  assert.equal(clampToSelection(2.5, 1.25, 4.75), 2.5);
});
test('a playing selection wraps to its start instead of stopping or escaping', () => {
  const range = { start: 1.25, end: 4.75, duration: 8 };
  assert.equal(playbackTime(4.75, range, true), 1.25);
  assert.equal(playbackTime(5, range, true), 1.25);
  assert.equal(playbackTime(0, range, true), 1.25);
  assert.equal(playbackTime(2, range, true), 2);
});
test('paused selection can show its end without restarting', () => {
  assert.equal(playbackTime(4.75, { start: 1.25, end: 4.75, duration: 8 }, false, true), 4.75);
});
test('whole-video playback stops normally unless preview looping was requested', () => {
  const range = { start: 0, end: 8, duration: 8 };
  assert.equal(loopsSelection(0, 8, 8), false);
  assert.equal(playbackTime(8, range, true), 8);
  assert.equal(playbackTime(8, range, true, true), 0);
  assert.equal(loopsSelection(0.001, 8, 8), true);
});
test('short clips and selections ending at the source end still loop', () => {
  assert.equal(playbackTime(1.04, { start: 1, end: 1.04, duration: 8 }, true), 1);
  assert.equal(playbackTime(8, { start: 7, end: 8, duration: 8 }, true), 7);
});
