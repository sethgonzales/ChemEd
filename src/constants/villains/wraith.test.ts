import { COUPLES } from '~/constants/electrochemistry';
import { WRAITH, wirePoint } from './wraith';

const { size, palette, draw } = WRAITH;
const count = (rows: string[], key: string) =>
  rows.join('').split(key).length - 1;
const E = (metal: string) => COUPLES.find((c) => c.id === metal)!.eStandard;

describe('the Voltaic Wraith', () => {
  it('fills its grid, in its own colours', () => {
    const rows = draw(0, 0);
    expect(rows).toHaveLength(size);
    for (const row of rows) {
      expect(row).toHaveLength(size);
      for (const p of row) expect(p === '.' || p in palette).toBe(true);
    }
  });

  it('haunts a cell of a zinc anode (−, left) and a copper cathode (+, right)', () => {
    const rows = draw(0, 0);
    // zinc has the lower E°, so it's oxidised: the anode
    expect(E('Zn')).toBeLessThan(E('Cu'));
    expect(rows[20][1]).toBe('Z');
    expect(rows[20][38]).toBe('C');
  });

  it('sends electrons along the wire from the zinc to the copper', () => {
    expect(wirePoint(0).x).toBeLessThan(wirePoint(1).x);
    expect(count(draw(0, 0), 'e')).toBeGreaterThanOrEqual(3);
  });

  it('crackles, and strikes the floor with lightning when it attacks', () => {
    const low = (attack: number) =>
      draw(0.5, attack).slice(34).join('').split('B').length - 1;
    expect(low(0)).toBe(0);
    expect(low(1)).toBeGreaterThan(0);
  });

  it('fizzles out in rising sparks when beaten', () => {
    expect(WRAITH.dust).toEqual({ key: 'D', dir: -1 });
    expect(palette.D).toBeDefined();
  });
});
