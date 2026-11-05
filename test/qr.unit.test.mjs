// The QR code encoder (ui/qr.js) against known vectors: a whole version 1 code, digests of version 7, 10 and 13 codes
// as another encoder makes them, the standard's error correction example, and the fixed parts every code has.
// node --test test/qr.unit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { qrCode, qrPath, capacity, rawModules, alignmentAt, eccOf, penalty } from '../ui/qr.js';

const rows = code => code.modules.map(r => r.map(d => (d ? '1' : '0')).join(''));
const digest = code => createHash('sha256').update(rows(code).join('\n')).digest('hex');

test('a short link is version 1, module for module as a reference encoder makes it (mask 2)', () => {
  const code = qrCode('https://a.b/cd', { mask: 2 });
  assert.equal(code.version, 1);
  assert.equal(code.size, 21);
  assert.equal(code.mask, 2);
  assert.deepEqual(rows(code), [
    '111111100101101111111', '100000100010001000001', '101110101001001011101', '101110101100001011101',
    '101110101110101011101', '100000101100101000001', '111111101010101111111', '000000001000100000000',
    '101111100111101111100', '101101001000011111111', '000001101011111100110', '011001011011010011100',
    '110110100000101011001', '000000001010000111101', '111111100111110100110', '100000101011000111101',
    '101110101111001111011', '101110101010011010100', '101110101100101100100', '100000100110010011100',
    '111111101000101101010',
  ]);
});

test('texts that fill versions 7, 10 and 13 match the reference encoder for two masks', () => {
  const base = 'https://example.org/n/';
  const cases = [
    [base + 'k'.repeat(100), 7, ['35599fa461768da2fb54bcd8c49037b47915bdb52e3c6461ae042a9f48639844', '4e89ff0809c5805eb18946aaf31881c0ad1b478f6cf7b726f831e351dad81a22']],
    [base + 'z'.repeat(191), 10, ['568c646530c6cb03a5d6983aa5bc5f93a098390f2bdafc55fb690271ddd447fd', '3f3f1b1b82afe982f2efaa49926d23c87d69f4921d4c17e68a4bf3ab12661a3d']],
    [base + 'y'.repeat(309), 13, ['43facbc3dfa57222641dbf29185120e73e867e1319f01471c6b6745fad03ad4f', '10739f83407cf922862d161d014a8511596cfcb11204e3316fd8c047cf2acdd8']],
  ];
  for (const [text, version, [m0, m5]] of cases) {
    const a = qrCode(text, { mask: 0 }), b = qrCode(text, { mask: 5 });
    assert.equal(a.version, version);
    assert.equal(a.size, version * 4 + 17);
    assert.equal(digest(a), m0, `v${version} mask 0`);
    assert.equal(digest(b), m5, `v${version} mask 5`);
  }
});

test('level M byte capacity, data modules and alignment centres follow the standard', () => {
  assert.equal(capacity(1), 14);
  assert.equal(capacity(10), 213);
  assert.equal(capacity(40), 2331);
  assert.equal(rawModules(1), 208);
  assert.equal(rawModules(7), 1568);
  assert.equal(rawModules(40), 29648);
  assert.deepEqual(alignmentAt(1), []);
  assert.deepEqual(alignmentAt(2), [6, 18]);
  assert.deepEqual(alignmentAt(7), [6, 22, 38]);
  assert.deepEqual(alignmentAt(32), [6, 34, 60, 86, 112, 138]);
});

test('error correction: the standard\'s HELLO WORLD 1-M example', () => {
  const data = [32, 91, 11, 120, 209, 114, 220, 77, 67, 64, 236, 17, 236, 17, 236, 17];
  assert.deepEqual([...eccOf(data, 10)], [196, 35, 39, 119, 235, 215, 231, 226, 93, 23]);
});

test('every code has its finders, timing and dark module, and the smallest version that fits', () => {
  for (const len of [1, 14, 15, 60, 213, 214, 500]) {
    const code = qrCode('a'.repeat(len));
    assert.equal(capacity(code.version) >= len, true);
    assert.equal(code.version === 1 || capacity(code.version - 1) < len, true, `${len} bytes: smallest version`);
    const n = code.size, m = code.modules;
    for (const [x0, y0] of [[0, 0], [n - 7, 0], [0, n - 7]]) {
      for (let i = 0; i < 7; i++) {
        assert.equal(m[y0][x0 + i] && m[y0 + 6][x0 + i] && m[y0 + i][x0] && m[y0 + i][x0 + 6], true);
        assert.equal(m[y0 + 2 + (i % 3)][x0 + 2 + Math.floor(i / 3) % 3], true);
      }
    }
    for (let i = 8; i < n - 8; i++) { assert.equal(m[6][i], i % 2 === 0); assert.equal(m[i][6], i % 2 === 0); }
    assert.equal(m[n - 8][8], true);
    assert.equal(penalty(m) > 0, true);
  }
});

test('the mask chosen is the one with the lowest penalty', () => {
  const text = 'https://example.org/screen/42';
  const best = qrCode(text);
  for (let k = 0; k < 8; k++) assert.equal(penalty(qrCode(text, { mask: k }).modules) >= penalty(best.modules), true);
});

test('UTF-8 text, bytes, the version floor, and too long', () => {
  assert.deepEqual(qrCode('café').modules, qrCode(new TextEncoder().encode('café')).modules);
  assert.equal(qrCode('hi', { minVersion: 10 }).version, 10);
  assert.throws(() => qrCode('x'.repeat(2332)), RangeError);
  assert.equal(qrCode('x'.repeat(2331)).version, 40);
});

test('qrPath draws each dark module once, inside the quiet edge', () => {
  const code = qrCode('https://a.b/cd', { mask: 2 });
  const d = qrPath(code, 4);
  const dark = code.modules.flat().filter(Boolean).length;
  const drawn = [...d.matchAll(/M(\d+) (\d+)h(\d+)/g)];
  assert.equal(drawn.length > 0, true);
  assert.equal(drawn.reduce((s, m) => s + Number(m[3]), 0), dark);
  for (const [, x, y] of drawn) { assert.equal(Number(x) >= 4 && Number(x) < 25, true); assert.equal(Number(y) >= 4 && Number(y) < 25, true); }
});
