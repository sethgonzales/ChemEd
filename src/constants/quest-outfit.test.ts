import { FRAMES, PALETTE, SPRITE_HEIGHT, SPRITE_WIDTH } from './mr-g-sprite';
import { FLAME_PALETTES, QUEST_PALETTE, questOutfit } from './quest-outfit';

const PALETTES = { ...PALETTE, ...QUEST_PALETTE };

const count = (rows: string[], key: string) =>
  rows.join('').split(key).length - 1;

// [row, column] of every pixel with this key
const where = (rows: string[], key: string) =>
  rows.flatMap((row, y) =>
    [...row].flatMap((p, x) => (p === key ? [[y, x]] : [])),
  );

// A different character on the same grid: clean-shaven, with long hair down
// both sides of the face
const otherSprite = FRAMES.idle.map((row, y) => {
  let r = row.replace(/b/g, 'S');
  if (y >= 6 && y <= 15)
    r = r.slice(0, 3) + 'H' + r.slice(4, 16) + 'H' + r.slice(17);
  return r;
});

describe('the quest outfit', () => {
  it.each(Object.entries(FRAMES))(
    'keeps the %s frame the full size, in palette colours',
    (_, frame) => {
      const rows = questOutfit(frame);
      expect(rows).toHaveLength(SPRITE_HEIGHT);
      for (const row of rows) {
        expect(row).toHaveLength(SPRITE_WIDTH);
        for (const p of row) expect(p === '.' || p in PALETTES).toBe(true);
      }
    },
  );

  it('pulls a hood over the hair', () => {
    expect(count(questOutfit(FRAMES.idle), 'H')).toBe(0);
    expect(count(questOutfit(FRAMES.idle), 'h')).toBe(0);
    expect(count(questOutfit(otherSprite), 'H')).toBe(0);
  });

  it('puts the goggles down over the eyes', () => {
    const rows = questOutfit(FRAMES.idle);
    const eyes = where(rows, 'E');
    expect(eyes.length).toBeGreaterThan(0);
    for (const [y, x] of eyes) {
      expect(rows[y][x - 1] + rows[y][x + 1]).toMatch(/G/); // framed by goggles
    }
  });

  it('wraps a cloak round the front, showing only a sliver of coat', () => {
    const rows = questOutfit(FRAMES.idle);
    expect(count(FRAMES.idle, 'C')).toBeGreaterThan(20);
    expect(count(rows, 'C')).toBe(0);
    expect(count(rows, 'c')).toBeLessThanOrEqual(4);
    expect(count(rows, 'V')).toBeGreaterThan(100);
    expect(count(rows, 'Q')).toBeGreaterThan(0); // the clasp
  });

  it('holds a lantern in front of the body, a little right of centre', () => {
    const flame = where(questOutfit(FRAMES.idle), 'W');
    expect(flame.length).toBeGreaterThan(0);
    const xs = flame.map(([, x]) => x);
    const mid = xs.reduce((a, b) => a + b) / xs.length;
    expect(mid).toBeGreaterThan(SPRITE_WIDTH / 2);
    expect(Math.max(...xs)).toBeLessThan(SPRITE_WIDTH - 2); // still on the body
  });

  it('shows the face underneath, whoever wears it', () => {
    const mrG = questOutfit(FRAMES.idle);
    const other = questOutfit(otherSprite);
    expect(count(mrG, 'b')).toBeGreaterThan(0); // his stubble
    expect(count(other, 'b')).toBe(0); // clean-shaven
    expect(questOutfit(FRAMES.talk)).not.toEqual(mrG);
    expect(questOutfit(FRAMES.blink)).not.toEqual(mrG);
  });

  it('keeps the wearer’s own feet, so walking still works', () => {
    const one = questOutfit(FRAMES.walk1);
    const two = questOutfit(FRAMES.walk2);
    expect(one.slice(28)).not.toEqual(two.slice(28));
    expect(one.slice(0, 28)).toEqual(two.slice(0, 28));
  });

  it('has a flickering flame: palettes that only change the flame', () => {
    expect(FLAME_PALETTES.length).toBeGreaterThan(1);
    for (const p of FLAME_PALETTES) {
      expect(Object.keys(p).sort()).toEqual(['W', 'Y', 'y']);
    }
  });
});
