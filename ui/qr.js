// A small QR code encoder (ISO/IEC 18004): byte mode (the text as UTF-8), error correction level M (about 15% of the
// code can be lost and it still reads), versions 1 to 40 (the smallest that fits; a link of up to 213 bytes fits in
// version 10, 57 x 57 modules), the mask picked by the standard's penalty rules. Written for app-ui; the steps follow
// the standard as Project Nayuki's QR Code generator (MIT) lays them out. qrSheet (qr-sheet.js) loads it with import()
// on first open, so it is never on an app's startup. Pure: no DOM; qrPath draws the dark modules as one SVG path.
// Nothing runs on import.

// level M, by version (index 0 unused): error correction codewords per block, and blocks
const ECC_M = [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28,
  28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28];
const BLOCKS_M = [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26,
  28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49];
// level M's two format bits
const M_BITS = 0;

/** @typedef {{ version: number, size: number, mask: number, modules: boolean[][] }} QrCode  modules[y][x]: true is dark */

/** The modules left for data and error correction in a version (pure). @param {number} ver */
export function rawModules(ver) {
  let r = (16 * ver + 128) * ver + 64;
  if (ver >= 2) {
    const n = Math.floor(ver / 7) + 2;
    r -= (25 * n - 10) * n - 55;
    if (ver >= 7) r -= 36;
  }
  return r;
}

/** How many data bytes a version holds at level M, in byte mode (pure). @param {number} ver */
export function capacity(ver) {
  const data = Math.floor(rawModules(ver) / 8) - ECC_M[ver] * BLOCKS_M[ver];
  return Math.floor((data * 8 - 4 - (ver < 10 ? 8 : 16)) / 8);
}

/** Where a version's alignment patterns are centred, on each axis (pure). @param {number} ver @returns {number[]} */
export function alignmentAt(ver) {
  if (ver === 1) return [];
  const n = Math.floor(ver / 7) + 2, size = ver * 4 + 17;
  const step = Math.floor((ver * 8 + n * 3 + 5) / (n * 4 - 4)) * 2;
  const at = [6];
  for (let pos = size - 7; at.length < n; pos -= step) at.splice(1, 0, pos);
  return at;
}

// GF(256) with the polynomial x^8 + x^4 + x^3 + x^2 + 1
/** @param {number} x @param {number} y */
function mul(x, y) {
  let z = 0;
  for (let i = 7; i >= 0; i--) {
    z = (z << 1) ^ ((z >>> 7) * 0x11d);
    z ^= ((y >>> i) & 1) * x;
  }
  return z;
}
/** The Reed-Solomon divisor of a degree. @param {number} degree */
function divisor(degree) {
  const r = new Array(degree).fill(0);
  r[degree - 1] = 1;
  let root = 1;
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < r.length; j++) {
      r[j] = mul(r[j], root);
      if (j + 1 < r.length) r[j] ^= r[j + 1];
    }
    root = mul(root, 0x02);
  }
  return r;
}
/** @param {number[]} data @param {number[]} div */
function remainder(data, div) {
  const r = div.map(() => 0);
  for (const b of data) {
    const f = b ^ /** @type {number} */ (r.shift());
    r.push(0);
    div.forEach((c, i) => { r[i] ^= mul(c, f); });
  }
  return r;
}

/** A block's Reed-Solomon error correction codewords (pure). @param {number[]} data @param {number} degree */
export const eccOf = (data, degree) => remainder(data, divisor(degree));

/** The data codewords with their error correction, interleaved (pure). @param {number[]} data @param {number} ver */
function withEcc(data, ver) {
  const blocks = BLOCKS_M[ver], ecc = ECC_M[ver], raw = Math.floor(rawModules(ver) / 8);
  const short = blocks - (raw % blocks), shortLen = Math.floor(raw / blocks);
  const div = divisor(ecc);
  /** @type {number[][]} */
  const all = [];
  for (let i = 0, k = 0; i < blocks; i++) {
    const dat = data.slice(k, k + shortLen - ecc + (i < short ? 0 : 1));
    k += dat.length;
    const block = [...dat, ...remainder(dat, div)];
    if (i < short) block.splice(shortLen - ecc, 0, -1);   // a gap, so every block lines up
    all.push(block);
  }
  const out = [];
  for (let i = 0; i < all[0].length; i++) {
    for (let j = 0; j < all.length; j++) if (i !== shortLen - ecc || j >= short) out.push(all[j][i]);
  }
  return out;
}

/** @param {number} x @param {number} i */
const bit = (x, i) => ((x >>> i) & 1) !== 0;

/** The 8 masks: whether module (x, y) flips. @type {((x: number, y: number) => boolean)[]} */
const MASKS = [
  (x, y) => (x + y) % 2 === 0,
  (_x, y) => y % 2 === 0,
  x => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

/**
 * The penalty of a finished code (pure): the standard's four rules (runs of five or more, 2 x 2 blocks, finder-like
 * patterns, the balance of dark and light). The mask with the lowest wins. @param {boolean[][]} m
 */
export function penalty(m) {
  const size = m.length;
  let p = 0;
  const line = (/** @type {(i: number) => boolean} */ at) => {
    let run = 1;
    for (let i = 1; i <= size; i++) {
      if (i < size && at(i) === at(i - 1)) { run++; continue; }
      if (run >= 5) p += 3 + run - 5;
      run = 1;
    }
    // 1:1:3:1:1 (dark light dark*3 light dark) with four light either side, inside the code
    for (let i = 0; i + 11 <= size; i++) {
      const s = Array.from({ length: 11 }, (_, k) => at(i + k));
      const core = (/** @type {number} */ o) => s[o] && !s[o + 1] && s[o + 2] && s[o + 3] && s[o + 4] && !s[o + 5] && s[o + 6];
      if ((core(0) && !s[7] && !s[8] && !s[9] && !s[10]) || (!s[0] && !s[1] && !s[2] && !s[3] && core(4))) p += 40;
    }
  };
  for (let y = 0; y < size; y++) line(x => m[y][x]);
  for (let x = 0; x < size; x++) line(y => m[y][x]);
  let dark = 0;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (m[y][x]) dark++;
      if (x + 1 < size && y + 1 < size && m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) p += 3;
    }
  }
  const total = size * size;
  p += (Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1) * 10;
  return p;
}

/**
 * The QR code of a text (pure): byte mode, level M, the smallest version that fits.
 * @param {string | Uint8Array} text  a string goes in as UTF-8
 * @param {{ mask?: number, minVersion?: number }} [o]  mask: 0-7 to use that mask (tests), else the best one
 * @returns {QrCode}
 * @throws {RangeError} when the text is longer than version 40 holds (2331 bytes)
 */
export function qrCode(text, { mask = -1, minVersion = 1 } = {}) {
  const bytes = typeof text === 'string' ? new TextEncoder().encode(text) : text;
  let ver = Math.max(1, Math.min(40, minVersion));
  while (ver <= 40 && capacity(ver) < bytes.length) ver++;
  if (ver > 40) throw new RangeError('Too long for a QR code');
  // the bits: mode 0100, the count, the bytes, a terminator, then whole bytes padded with 0xEC 0x11
  /** @type {number[]} */
  const bits = [];
  const put = (/** @type {number} */ v, /** @type {number} */ n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
  put(4, 4);
  put(bytes.length, ver < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  const room = (Math.floor(rawModules(ver) / 8) - ECC_M[ver] * BLOCKS_M[ver]) * 8;
  put(0, Math.min(4, room - bits.length));
  put(0, (8 - (bits.length % 8)) % 8);
  for (let pad = 0xec; bits.length < room; pad ^= 0xec ^ 0x11) put(pad, 8);
  /** @type {number[]} */
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));

  const size = ver * 4 + 17;
  const modules = Array.from({ length: size }, () => new Array(size).fill(false));
  const fixed = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (/** @type {number} */ x, /** @type {number} */ y, /** @type {boolean} */ dark) => { modules[y][x] = dark; fixed[y][x] = true; };
  // timing lines, finders (with their light edge), alignment patterns
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]]) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
    }
  }
  const at = alignmentAt(ver), last = at.length - 1;
  for (let i = 0; i <= last; i++) {
    for (let j = 0; j <= last; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(at[i] + dx, at[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
  }
  /** @param {number} m */
  const format = m => {
    const d = (M_BITS << 3) | m;
    let r = d;
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
    const f = ((d << 10) | r) ^ 0x5412;
    for (let i = 0; i <= 5; i++) set(8, i, bit(f, i));
    set(8, 7, bit(f, 6)); set(8, 8, bit(f, 7)); set(7, 8, bit(f, 8));
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(f, i));
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(f, i));
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(f, i));
    set(8, size - 8, true);
  };
  format(0);   // (reserves its modules; drawn again with the mask)
  if (ver >= 7) {
    let r = ver;
    for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25);
    const v = (ver << 12) | r;
    for (let i = 0; i < 18; i++) {
      const a = size - 11 + (i % 3), b = Math.floor(i / 3);
      set(a, b, bit(v, i)); set(b, a, bit(v, i));
    }
  }
  // the codewords, two columns at a time from the right, up then down, round the fixed modules
  const words = withEcc(data, ver);
  let k = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let v = 0; v < size; v++) {
      for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
        if (!fixed[y][x] && k < words.length * 8) { modules[y][x] = bit(words[k >>> 3], 7 - (k & 7)); k++; }
      }
    }
  }
  /** @param {number} m */
  const masked = m => {
    const out = modules.map(row => [...row]);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fixed[y][x] && MASKS[m](x, y)) out[y][x] = !out[y][x];
    return out;
  };
  /** @param {number} m */
  const finish = m => { format(m); return masked(m); };
  let best = mask;
  if (best < 0 || best > 7) {
    let low = Infinity;
    for (let m = 0; m < 8; m++) {
      const p = penalty(finish(m));
      if (p < low) { low = p; best = m; }
    }
  }
  return { version: ver, size, mask: best, modules: finish(best) };
}

/**
 * The dark modules as one SVG path (pure), a unit per module, each row's runs as rectangles, offset by the quiet
 * zone: draw it in a viewBox of size + 2 * quiet. @param {QrCode} code @param {number} [quiet]  modules of light edge (4)
 */
export function qrPath(code, quiet = 4) {
  let d = '';
  code.modules.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      let run = 1;
      while (row[x + run]) run++;
      d += `M${x + quiet} ${y + quiet}h${run}v1h-${run}z`;
      x += run - 1;
    }
  });
  return d;
}
