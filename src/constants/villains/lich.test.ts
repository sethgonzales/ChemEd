import { LICH } from './lich';

const { size, palette, draw } = LICH;
const count = (rows: string[], key: string) =>
  rows.join('').split(key).length - 1;
// where each of the s orbital's two electrons is: the first pixel of each
const electrons = (rows: string[]) =>
  rows.flatMap((row, y) =>
    [...row].flatMap((p, x) => (p === 'W' ? [`${x},${y}`] : [])),
  );

describe('the Orbital Lich', () => {
  it('fills its grid, in its own colours', () => {
    const rows = draw(0, 0);
    expect(rows).toHaveLength(size);
    for (const row of rows) {
      expect(row).toHaveLength(size);
      for (const p of row) expect(p === '.' || p in palette).toBe(true);
    }
  });

  it('is circled by an s orbital whose two electrons go round', () => {
    expect(count(draw(0, 0), 's')).toBeGreaterThan(20);
    const a = electrons(draw(0, 0)).join();
    const b = electrons(draw(1, 0)).join();
    expect(a).not.toBe('');
    expect(a).not.toBe(b);
  });

  // one lobe passes in front of the Lich and one behind, so both always show
  it('turns a p orbital whose two lobes have opposite phases', () => {
    const lobes = (t: number) => {
      const rows = draw(t, 0);
      return [count(rows, 'P'), count(rows, 'N')];
    };
    for (let t = 0; t < 6; t += 0.1) {
      const [plus, minus] = lobes(t);
      expect(plus).toBeGreaterThan(8);
      expect(minus).toBeGreaterThan(8);
    }
    expect(draw(0, 0).join()).not.toBe(draw(0.7, 0).join());
  });

  it('flares its eyes white when it attacks', () => {
    expect(count(draw(0, 0), 'w')).toBe(0);
    expect(count(draw(0, 0.5), 'w')).toBeGreaterThan(0);
  });

  it('falls to bone dust when beaten', () => {
    expect(LICH.dust.key).toBe('D');
    expect(palette.D).toBeDefined();
  });
});
