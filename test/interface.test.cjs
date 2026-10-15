'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { dictionaries, translate, normalizeLanguage } = require('../src/shared/i18n.js');
const { formatTime, parseTime } = require('../src/shared/time.js');

test('all four languages cover every interface string', () => {
  const base = Object.keys(dictionaries.en).sort();
  assert.equal(Object.keys(dictionaries).length, 4);
  for (const [language, dictionary] of Object.entries(dictionaries)) {
    assert.deepEqual(Object.keys(dictionary).sort(), base, language);
    assert.ok(Object.values(dictionary).every(value => typeof value === 'string' && value.length));
  }
  const html = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf8');
  for (const match of html.matchAll(/data-(?:i18n|title|label)="([^"]+)"/g)) assert.ok(dictionaries.en[match[1]], `Missing ${match[1]}`);
});
test('locales normalize and template substitution works', () => {
  assert.equal(normalizeLanguage('ru-RU'), 'ru'); assert.equal(normalizeLanguage('de_DE'), 'de');
  assert.equal(normalizeLanguage('fr-FR'), 'en');
  assert.equal(translate('es', 'preparingProgress', { percent: 42 }), 'Preparando vista previa · 42%');
});
test('time parsing and display preserve millisecond boundaries', () => {
  for (const value of [0, 0.04, 1.25, 59.999, 60, 3600, 3999.456]) assert.ok(Math.abs(parseTime(formatTime(value, true)) - value) < 1e-8);
  assert.equal(formatTime(59.9999, true), '00:01:00.000');
  assert.equal(parseTime('1:23.456'), 83.456); assert.equal(parseTime('12,5'), 12.5);
  for (const value of ['-1', '1:60', '1:99:00', 'abc', '1;quit', '', '1:00.1234']) assert.ok(Number.isNaN(parseTime(value)), value);
});
