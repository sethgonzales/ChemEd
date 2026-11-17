import { BLOCK_COLORS } from '~/constants/blocks';
import { SPHINX } from './sphinx';

const { size, palette, draw } = SPHINX;

const count = (rows: string[], key: string) =>
  rows.join('').split(key).length - 1;
// where the glowing tile is: the first pixel of it
const glowAt = (rows: string[]) => rows.join('').indexOf('Y');

describe('the Element Sphinx', () => {
  it('fills its grid, in its own colours', () => {
    const rows = draw(0, 0);
    expect(rows).toHaveLength(size);
    for (const row of rows) {
      expect(row).toHaveLength(size);
      for (const p of row) expect(p === '.' || p in palette).toBe(true);
    }
  });

  it('wears a headdress of element tiles in the four block colours', () => {
    const rows = draw(0, 0);
    for (const [key, block] of [
      ['R', 's'],
      ['O', 'p'],
      ['B', 'd'],
      ['G', 'f'],
    ] as const) {
      expect(palette[key]).toBe(BLOCK_COLORS[block]);
      expect(count(rows, key)).toBeGreaterThan(4);
    }
  });

  it('lights one tile at a time, moving from tile to tile', () => {
    const spots = new Set<number>();
    for (let t = 0; t < 10; t += 0.5) {
      const rows = draw(t, 0);
      expect(count(rows, 'Y')).toBeGreaterThanOrEqual(1);
      expect(count(rows, 'Y')).toBeLessThanOrEqual(4);
      spots.add(glowAt(rows));
    }
    expect(spots.size).toBeGreaterThan(5);
  });

  it('glares red and opens its mouth when it attacks', () => {
    expect(count(draw(0, 0), 'e')).toBe(0);
    expect(count(draw(0, 0.5), 'e')).toBeGreaterThan(0);
    expect(count(draw(0, 0.5), 'm')).toBeGreaterThan(0);
  });

  it('blinks now and then', () => {
    const open = (t: number) => count(draw(t, 0), 'E');
    const times = Array.from({ length: 64 }, (_, i) => i * 0.05);
    expect(times.some((t) => open(t) === 0)).toBe(true);
    expect(times.some((t) => open(t) > 0)).toBe(true);
  });

  it('crumbles to gravel when beaten', () => {
    expect(SPHINX.dust.key).toBe('D');
    expect(palette.D).toBeDefined();
  });
});
