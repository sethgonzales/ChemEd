// Redraws Pixelify Sans's 5 and 7 and writes the font as WOFF.
// Usage: node scripts/redraw-digits.mjs <dir>/w600.woff src/fonts/pixelify-sans-600.woff
// The input is a static instance at 400, 500, 600 or 700, as TTF or WOFF
// (Google Fonts' TTFs, or our own copies), named w400 … w700 in one folder:
// the 400 maps the new digits onto the other weights' grids.
// Only the glyf/loca/hmtx entries for those glyphs change; every other table
// and glyph is copied as is.
import fs from 'fs';
import zlib from 'zlib';
import opentype from 'opentype.js';

const [, , input, output] = process.argv;

// the new digits, on the 400 weight's grid (y up), clockwise outer contours
const DIGITS_400 = {
  // a flat top running the full width, a straight left stem and the S's
  // lower bowl: Pixelify's own 5 is an S
  5: [
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
  ],
  // a flat top running the full width, then stepping down and left to a stem
  // in the middle: Pixelify's own 7 is a wide 1
  7: [
    [343, -12],
    [241, -12],
    [241, 270],
    [343, 270],
    [343, 440],
    [423, 440],
    [423, 530],
    [60, 530],
    [60, 631],
    [525, 631],
    [525, 359],
    [433, 359],
    [433, 179],
    [343, 179],
  ],
};

/** The font file's tables, from a TTF or a WOFF 1.0 */
function readTables(buf) {
  const tables = {};
  if (buf.toString('latin1', 0, 4) === 'wOFF') {
    const n = buf.readUInt16BE(12);
    for (let i = 0; i < n; i++) {
      const r = 44 + i * 20;
      const offset = buf.readUInt32BE(r + 4);
      const comp = buf.readUInt32BE(r + 8);
      const orig = buf.readUInt32BE(r + 12);
      const data = buf.subarray(offset, offset + comp);
      tables[buf.toString('latin1', r, r + 4)] =
        comp < orig ? zlib.inflateSync(data) : data;
    }
  } else {
    const n = buf.readUInt16BE(4);
    for (let i = 0; i < n; i++) {
      const r = 12 + i * 16;
      const offset = buf.readUInt32BE(r + 8);
      tables[buf.toString('latin1', r, r + 4)] = buf.subarray(
        offset,
        offset + buf.readUInt32BE(r + 12),
      );
    }
  }
  return tables;
}

const load = (path) => {
  const b = fs.readFileSync(path);
  return opentype.parse(
    b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength),
  );
};
const buf = fs.readFileSync(input);
const font = load(input);

// map the 400 grid onto this weight's, through glyphs that keep the same
// points in every weight (instances of one variable font): the S for the
// edges, the 1 for the middle stem
const base = load(input.replace(/w\d+\.(ttf|woff)$/, 'w400.$1'));
const xs = new Map(),
  ys = new Map();
const add = (m, a, b) => {
  if (m.has(a) && m.get(a) !== b)
    throw new Error(`grid clash ${a}: ${m.get(a)} / ${b}`);
  m.set(a, b);
};
for (const char of 'S1') {
  const pts = (f) =>
    f.charToGlyph(char).path.commands.filter((c) => c.type !== 'Z');
  const from = pts(base);
  const to = pts(font);
  if (from.length !== to.length)
    throw new Error(`${char} differs in structure`);
  from.forEach((c, i) => {
    add(xs, c.x, to[i].x);
    add(ys, c.y, to[i].y);
  });
}
const redrawn = new Map(
  Object.entries(DIGITS_400).map(([char, points]) => [
    font.charToGlyphIndex(char),
    points.map(([x, y]) => {
      if (!xs.has(x) || !ys.has(y))
        throw new Error(`no grid line for ${char}: ${x},${y}`);
      return [xs.get(x), ys.get(y)];
    }),
  ]),
);

// ---- tables
const tables = readTables(buf);
const table = (tag) => tables[tag];
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
  if (redrawn.has(i)) g = simpleGlyph(redrawn.get(i));
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

// each redrawn glyph's lsb in hmtx must match its new xMin
const hmtx = Buffer.from(table('hmtx'));
const numH = table('hhea').readUInt16BE(34);
for (const [target, points] of redrawn) {
  const xMin = Math.min(...points.map((p) => p[0]));
  if (target < numH) hmtx.writeInt16BE(xMin, target * 4 + 2);
  else hmtx.writeInt16BE(xMin, numH * 4 + (target - numH) * 2);
}

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
  if (redrawn.has(i)) continue;
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
  'bytes; redrew',
  Object.keys(DIGITS_400).join(', '),
);
