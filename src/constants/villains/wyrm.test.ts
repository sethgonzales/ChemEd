import { WYRM } from './wyrm';

const { size, palette, draw } = WYRM;
const count = (rows: string[], key: string) =>
  rows.join('').split(key).length - 1;
const where = (rows: string[], key: string) =>
  rows.flatMap((r, y) =>
    [...r].flatMap((p, x) => (p === key ? [`${x},${y}`] : [])),
  );

describe('the Frost Wyrm', () => {
  it('fills its grid, in its own colours', () => {
    const rows = draw(0, 0);
    expect(rows).toHaveLength(size);
    for (const row of rows) {
      expect(row).toHaveLength(size);
      for (const p of row) expect(p === '.' || p in palette).toBe(true);
    }
  });

  it('coils its icy body up from the floor', () => {
    const rows = draw(0, 0);
    expect(count(rows, 'I')).toBeGreaterThan(80);
    expect(count(rows, 'b')).toBeGreaterThan(10); // its paler belly
  });

  it('sits in falling snow', () => {
    const snow = (rows: string[]) => count(rows, 'S') + count(rows, 's');
    expect(snow(draw(0, 0))).toBeGreaterThanOrEqual(8);
    expect(where(draw(0, 0), 'S')).not.toEqual(where(draw(2, 0), 'S'));
  });

  it('opens its jaw and breathes frost only when it attacks', () => {
    const frost = (rows: string[]) => count(rows, 'F') + count(rows, 'f');
    expect(frost(draw(0, 0))).toBe(0);
    expect(frost(draw(0, 1))).toBeGreaterThan(5);
    expect(where(draw(0, 1), 'J')).not.toEqual(where(draw(0, 0), 'J'));
    expect(count(draw(0, 1), 'w')).toBeGreaterThan(0);
  });

  it('steams away, rising, when beaten', () => {
    expect(WYRM.dust).toEqual({ key: 'D', dir: -1 });
    expect(palette.D).toBeDefined();
  });
});
