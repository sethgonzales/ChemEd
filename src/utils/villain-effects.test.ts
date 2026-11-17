import { HIT_SHAKE, defeatRows, hitPalette } from './villain-effects';

const block = ['.RRR.', '.RRR.', '.KKK.', '.....', '.....'];
const pixels = (rows: string[]) => rows.join('').replace(/\./g, '').length;
const lowest = (rows: string[]) =>
  Math.max(...rows.flatMap((r, y) => (r.replace(/\./g, '') ? [y] : [])));
const highest = (rows: string[]) =>
  Math.min(...rows.flatMap((r, y) => (r.replace(/\./g, '') ? [y] : [])));

describe('hitPalette', () => {
  it('flashes every colour white except the outline', () => {
    const p = hitPalette({ K: '#111', R: '#f00', B: '#00f' });
    expect(p).toEqual({ K: '#111', R: '#ffffff', B: '#ffffff' });
  });
});

describe('HIT_SHAKE', () => {
  it('shakes both ways and settles back where it started', () => {
    expect(HIT_SHAKE.some((x) => x > 0)).toBe(true);
    expect(HIT_SHAKE.some((x) => x < 0)).toBe(true);
    expect(HIT_SHAKE.at(-1)).toBe(0);
  });
});

describe('defeatRows', () => {
  it('starts whole', () => {
    expect(defeatRows(block, 0, 1, 'D')).toEqual(block);
  });

  it('is gone by the end', () => {
    expect(pixels(defeatRows(block, 1, 1, 'D'))).toBe(0);
  });

  it('turns into its dust as it breaks up', () => {
    const mid = defeatRows(block, 0.5, 1, 'D').join('');
    expect(mid).toContain('D');
  });

  it('falls, or rises like steam, the way its substance goes', () => {
    const tall = Array.from({ length: 30 }, (_, y) =>
      y >= 12 && y < 18 ? '..RRRRRR..' : '..........',
    );
    expect(lowest(defeatRows(tall, 0.4, 1, 'D'))).toBeGreaterThan(lowest(tall));
    expect(highest(defeatRows(tall, 0.4, -1, 'D'))).toBeLessThan(highest(tall));
  });

  it('keeps the grid the same size', () => {
    const rows = defeatRows(block, 0.5, 1, 'D');
    expect(rows).toHaveLength(block.length);
    rows.forEach((r) => expect(r).toHaveLength(block[0].length));
  });
});
