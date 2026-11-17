// Redraws Pixelify Sans's "five" in a static TTF and writes it as WOFF.
// Usage: node scripts/redraw-five.mjs <dir>/w600.ttf src/fonts/pixelify-sans-600.woff
// with Google Fonts' static TTFs for 400–700 saved as w400.ttf … w700.ttf in
// one folder (the 400 maps the new 5 onto the other weights' grids).
// Only the glyf/loca entries for that glyph change; every other table and
// glyph is copied as is.
import fs from 'fs';
import zlib from 'zlib';
import opentype from 'opentype.js';

const [, , input, output] = process.argv;
const buf = fs.readFileSync(input);
const font = opentype.loadSync(input);

// the new 5, on the 400 weight's grid (y up), clockwise outer contour
const FIVE_400 = [
  [433, -12],
  [151, -12],
  [151, 78],
  [60, 78],
  [60, 179],
  [161, 179],
  [161, 88],
  [423, 88],
  [423, 260],
  [60, 260],
  [60, 631],
  [525, 631],
  [525, 530],
  [161, 530],
  [161, 359],
  [433, 359],
  [433, 270],
  [525, 270],
  [525, 78],
  [433, 78],
];

// map the 400 grid onto this weight's, through the S (same points in every
// weight, since they're instances of one variable font)
const sAt = (f) =>
  f.charToGlyph('S').path.commands.filter((c) => c.type !== 'Z');
const base = opentype.loadSync(input.replace(/w\d+\.ttf$/, 'w400.ttf'));
const from = sAt(base);
const to = sAt(font);
if (from.length !== to.length) throw new Error('S differs in structure');
const xs = new Map(),
  ys = new Map();
const add = (m, a, b) => {
  if (m.has(a) && m.get(a) !== b)
    throw new Error(`grid clash ${a}: ${m.get(a)} / ${b}`);
  m.set(a, b);
};
from.forEach((c, i) => {
  add(xs, c.x, to[i].x);
  add(ys, c.y, to[i].y);
});
const five = FIVE_400.map(([x, y]) => {
  if (!xs.has(x) || !ys.has(y)) throw new Error(`no grid line for ${x},${y}`);
  return [xs.get(x), ys.get(y)];
});

// ---- tables
const numTables = buf.readUInt16BE(4);
const tables = {};
for (let i = 0; i < numTables; i++) {
  const r = 12 + i * 16;
  const tag = buf.toString('latin1', r, r + 4);
  tables[tag] = {
    offset: buf.readUInt32BE(r + 8),
    length: buf.readUInt32BE(r + 12),
  };
}
const table = (tag) =>
  buf.subarray(tables[tag].offset, tables[tag].offset + tables[tag].length);
const head = Buffer.from(table('head'));
const longLoca = head.readInt16BE(50) === 1;
const numGlyphs = table('maxp').readUInt16BE(4);
const loca = table('loca');
const glyf = table('glyf');
const offsets = [];
for (let i = 0; i <= numGlyphs; i++) {
  offsets.push(
    longLoca ? loca.readUInt32BE(i * 4) : loca.readUInt16BE(i * 2) * 2,
  );
}
const target = font.charToGlyphIndex('5');

// a simple glyph: one contour, no instructions, every point on the curve
function simpleGlyph(points) {
  const n = points.length;
  const xsArr = points.map((p) => p[0]),
    ysArr = points.map((p) => p[1]);
  const b = Buffer.alloc(10 + 2 + 2 + n + n * 4);
  let o = 0;
  b.writeInt16BE(1, o);
  o += 2;
  b.writeInt16BE(Math.min(...xsArr), o);
  o += 2;
  b.writeInt16BE(Math.min(...ysArr), o);
  o += 2;
  b.writeInt16BE(Math.max(...xsArr), o);
  o += 2;
  b.writeInt16BE(Math.max(...ysArr), o);
  o += 2;
  b.writeUInt16BE(n - 1, o);
  o += 2;
  b.writeUInt16BE(0, o);
  o += 2; // no hinting instructions
  for (let i = 0; i < n; i++) b[o++] = 0x01; // on-curve, 16-bit deltas
  let px = 0,
    py = 0;
  for (const [x] of points) {
    b.writeInt16BE(x - px, o);
    o += 2;
    px = x;
  }
  for (const [, y] of points) {
    b.writeInt16BE(y - py, o);
    o += 2;
    py = y;
  }
  return b;
}

const pad4 = (b) =>
  b.length % 4 ? Buffer.concat([b, Buffer.alloc(4 - (b.length % 4))]) : b;
const pieces = [];
const newOffsets = [0];
for (let i = 0; i < numGlyphs; i++) {
  let g = glyf.subarray(offsets[i], offsets[i + 1]);
  if (i === target) g = simpleGlyph(five);
  g = pad4(g);
  pieces.push(g);
  newOffsets.push(newOffsets[i] + g.length);
}
const newGlyf = Buffer.concat(pieces);
const newLoca = Buffer.alloc((numGlyphs + 1) * (longLoca ? 4 : 2));
newOffsets.forEach((v, i) =>
  longLoca
    ? newLoca.writeUInt32BE(v, i * 4)
    : newLoca.writeUInt16BE(v / 2, i * 2),
);

// lsb of the five in hmtx must match its new xMin
const hmtx = Buffer.from(table('hmtx'));
const numH = table('hhea').readUInt16BE(34);
const xMin = Math.min(...five.map((p) => p[0]));
if (target < numH) hmtx.writeInt16BE(xMin, target * 4 + 2);
else hmtx.writeInt16BE(xMin, numH * 4 + (target - numH) * 2);

const out = {};
for (const tag of Object.keys(tables)) out[tag] = Buffer.from(table(tag));
out.glyf = newGlyf;
out.loca = newLoca;
out.hmtx = hmtx;
head.writeUInt32BE(0, 8); // checkSumAdjustment: recomputed below
out.head = head;
delete out.DSIG; // any signature no longer matches
delete out.hdmx; // hinted device widths, stale for the new glyph
delete out.LTSH;

// ---- check nothing else moved
for (let i = 0; i < numGlyphs; i++) {
  if (i === target) continue;
  const a = glyf.subarray(offsets[i], offsets[i + 1]);
  const b = newGlyf.subarray(newOffsets[i], newOffsets[i] + a.length);
  if (!a.equals(b)) throw new Error(`glyph ${i} changed`);
}

// ---- checksums
const checksum = (b) => {
  const p = pad4(b);
  let s = 0;
  for (let i = 0; i < p.length; i += 4) s = (s + p.readUInt32BE(i)) >>> 0;
  return s;
};
const tags = Object.keys(out).sort();
// the whole-font sum, as a TTF would lay it out
{
  const n = tags.length;
  let offset = 12 + n * 16;
  const dir = Buffer.alloc(12 + n * 16);
  dir.writeUInt32BE(0x00010000, 0);
  dir.writeUInt16BE(n, 4);
  let es = Math.floor(Math.log2(n));
  dir.writeUInt16BE(2 ** es * 16, 6);
  dir.writeUInt16BE(es, 8);
  dir.writeUInt16BE(n * 16 - 2 ** es * 16, 10);
  const bodies = [];
  tags.forEach((tag, i) => {
    const r = 12 + i * 16;
    dir.write(tag, r, 'latin1');
    dir.writeUInt32BE(checksum(out[tag]), r + 4);
    dir.writeUInt32BE(offset, r + 8);
    dir.writeUInt32BE(out[tag].length, r + 12);
    bodies.push(pad4(out[tag]));
    offset += pad4(out[tag]).length;
  });
  const ttf = Buffer.concat([dir, ...bodies]);
  const adjust = (0xb1b0afba - checksum(ttf)) >>> 0;
  out.head.writeUInt32BE(adjust, 8);
  var sfntSize = ttf.length;
}

// ---- WOFF 1.0: each table zlib-compressed where that saves space
const entries = tags.map((tag) => {
  const orig = out[tag];
  const z = zlib.deflateSync(orig, { level: 9 });
  return {
    tag,
    orig,
    data: z.length < orig.length ? z : orig,
    sum: checksum(orig),
  };
});
const headerSize = 44,
  dirSize = entries.length * 20;
let offset = headerSize + dirSize;
const woffDir = Buffer.alloc(dirSize);
const bodies = [];
entries.forEach((e, i) => {
  const r = i * 20;
  woffDir.write(e.tag, r, 'latin1');
  woffDir.writeUInt32BE(offset, r + 4);
  woffDir.writeUInt32BE(e.data.length, r + 8);
  woffDir.writeUInt32BE(e.orig.length, r + 12);
  woffDir.writeUInt32BE(e.sum, r + 16);
  bodies.push(pad4(e.data));
  offset += pad4(e.data).length;
});
const header = Buffer.alloc(headerSize);
header.write('wOFF', 0, 'latin1');
header.writeUInt32BE(0x00010000, 4);
header.writeUInt32BE(offset, 8);
header.writeUInt16BE(entries.length, 12);
header.writeUInt32BE(sfntSize, 16);
header.writeUInt16BE(1, 20);
fs.writeFileSync(output, Buffer.concat([header, woffDir, ...bodies]));
console.log(
  output,
  offset,
  'bytes; five =',
  JSON.stringify(five.slice(0, 3)),
  '...',
);
