import { SLIME } from './slime';

const { size, palette, draw } = SLIME;
const count = (rows: string[], key: string) =>
  rows.join('').split(key).length - 1;
const where = (rows: string[], key: string) =>
  rows.flatMap((r, y) =>
    [...r].flatMap((p, x) => (p === key ? [`${x},${y}`] : [])),
  );
const top = (rows: string[]) => rows.findIndex((r) => r.includes('L'));

describe('the Precipitate Slime', () => {
  it('fills its grid, in its own colours', () => {
    const rows = draw(0, 0);
    expect(rows).toHaveLength(size);
    for (const row of rows) {
      expect(row).toHaveLength(size);
      for (const p of row) expect(p === '.' || p in palette).toBe(true);
    }
  });

  it('is a clear ooze that squashes and stretches', () => {
    expect(count(draw(0, 0), 'L')).toBeGreaterThan(150);
    const tops = new Set<number>();
    for (let t = 0; t < 3; t += 0.1) tops.add(top(draw(t, 0)));
    expect(tops.size).toBeGreaterThan(1);
  });

  it('has a solid forming inside it, settling into a layer at the bottom', () => {
    const rows = draw(0, 0);
    expect(rows[34].split('P').length - 1).toBeGreaterThan(10);
    const falling = (t: number) =>
      where(draw(t, 0), 'P').filter((p) => Number(p.split(',')[1]) < 33);
    expect(falling(0)).not.toEqual(falling(1));
  });

  it('spits a glob of it only when attacking', () => {
    expect(count(draw(0, 0), 'G')).toBe(0);
    expect(count(draw(0, 0.5), 'G')).toBeGreaterThan(3);
  });

  it('collapses into sludge when beaten', () => {
    expect(SLIME.dust).toEqual({ key: 'D', dir: 1 });
    expect(palette.D).toBeDefined();
  });
});
