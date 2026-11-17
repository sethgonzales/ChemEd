import { BLOCK_COLORS } from '~/constants/blocks';
import { INDICATORS } from '~/constants/titrations';
import { ALCHEMIST } from './alchemist';

const { size, palette, draw } = ALCHEMIST;
const count = (rows: string[], key: string) =>
  rows.join('').split(key).length - 1;
const top = (rows: string[], key: string) =>
  rows.findIndex((r) => r.includes(key));
const INDICATOR_COLOURS = new Set(
  INDICATORS.flatMap((i) => i.colors.map((c) => c.slice(0, 7))),
);

describe('the Alchemist', () => {
  it('fills its grid, in its own colours', () => {
    const rows = draw(0, 0);
    expect(rows).toHaveLength(size);
    for (const row of rows) {
      expect(row).toHaveLength(size);
      for (const p of row) expect(p === '.' || p in palette).toBe(true);
    }
  });

  it('wears a piece of every chamber: an orbital, element tiles and a glowing tile on its staff', () => {
    const rows = draw(0, 0);
    expect(count(rows, 'o')).toBeGreaterThan(20); // the orbital round its hood
    for (const [key, block] of [
      ['1', 's'],
      ['2', 'p'],
      ['3', 'd'],
      ['4', 'f'],
    ] as const) {
      expect(palette[key]).toBe(BLOCK_COLORS[block]);
      expect(count(rows, key)).toBeGreaterThan(1); // its hem of tiles
    }
    expect(count(rows, 'Y') + count(rows, 'y')).toBeGreaterThan(4); // the staff’s tile
  });

  it('carries a flask that turns through the indicators’ colours', () => {
    const seen = new Set<string>();
    for (let t = 0; t < 12; t += 0.25) {
      const rows = draw(t, 0);
      for (const key of ALCHEMIST.liquids)
        if (count(rows, key)) seen.add(palette[key]);
    }
    expect(seen.size).toBeGreaterThan(3);
    for (const c of seen) expect(INDICATOR_COLOURS.has(c)).toBe(true);
  });

  it('raises its flask and its eyes turn red when it attacks', () => {
    expect(top(draw(0, 1), 'g')).toBeLessThan(top(draw(0, 0), 'g'));
    expect(count(draw(0, 0), 'r')).toBe(0);
    expect(count(draw(0, 1), 'r')).toBeGreaterThan(0);
  });

  it('vanishes in purple smoke when beaten', () => {
    expect(ALCHEMIST.dust).toEqual({ key: 'D', dir: -1 });
    expect(palette.D).toBeDefined();
  });
});
