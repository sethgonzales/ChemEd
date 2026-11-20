import { DJINN } from './djinn';

const { size, palette, draw } = DJINN;
const count = (rows: string[], key: string) =>
  rows.join('').split(key).length - 1;
const gas = (rows: string[]) => count(rows, 'G') + count(rows, 'g');
const widest = (rows: string[]) =>
  Math.max(
    ...rows.slice(0, 26).map((r) => r.lastIndexOf('G') - r.indexOf('G')),
  );

describe('the Pressure Djinn', () => {
  it('fills its grid, in its own colours', () => {
    for (const [t, attack] of [
      [0, 0],
      [1.3, 0],
      [0.4, 0.5],
      [2, 1],
    ]) {
      const rows = draw(t, attack);
      expect(rows).toHaveLength(size);
      for (const row of rows) {
        expect(row).toHaveLength(size);
        for (const p of row) expect(p === '.' || p in palette).toBe(true);
      }
    }
  });

  it('rises out of a stoppered flask', () => {
    const rows = draw(0, 0);
    expect(count(rows, 'F')).toBeGreaterThan(30); // glass
    expect(count(rows, 'C')).toBeGreaterThan(3); // the stopper
    // the flask sits below the spirit
    const flaskTop = rows.findIndex((r) => r.includes('F'));
    const gasTop = rows.findIndex((r) => /[Gg]/.test(r));
    expect(gasTop).toBeLessThan(flaskTop);
  });

  it('swirls as it waits', () => {
    expect(draw(0, 0)).not.toEqual(draw(0.7, 0));
  });

  it('swells as it attacks, the way a gas expands', () => {
    expect(gas(draw(0, 1))).toBeGreaterThan(gas(draw(0, 0)) * 1.2);
    expect(widest(draw(0, 1))).toBeGreaterThan(widest(draw(0, 0)));
  });

  it('hisses away as vapour, rising, when beaten', () => {
    expect(DJINN.dust).toEqual({ key: 'D', dir: -1 });
    expect(palette.D).toBeDefined();
  });
});
