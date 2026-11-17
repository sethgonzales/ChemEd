import { INDICATORS } from '~/constants/titrations';
import { HYDRA } from './hydra';

const { size, palette, draw } = HYDRA;
const count = (rows: string[], key: string) =>
  rows.join('').split(key).length - 1;
const lowest = (rows: string[], key: string) =>
  rows.reduce((y, r, i) => (r.includes(key) ? i : y), -1);
const LIQUIDS = ['1', '2', '3'];

describe('the Acid Hydra', () => {
  it('fills its grid, in its own colours', () => {
    const rows = draw(0, 0);
    expect(rows).toHaveLength(size);
    for (const row of rows) {
      expect(row).toHaveLength(size);
      for (const p of row) expect(p === '.' || p in palette).toBe(true);
    }
  });

  it('has three flask heads, each holding an indicator in its real colour', () => {
    const rows = draw(0, 0);
    for (const key of LIQUIDS) expect(count(rows, key)).toBeGreaterThan(3);
    // methyl orange in acid, then bromothymol blue and phenolphthalein in base
    const [mo, bb, pp] = INDICATORS;
    expect(palette['1']).toBe(mo.colors[0].slice(0, 7));
    expect(palette['2']).toBe(bb.colors.at(-1)!.slice(0, 7));
    expect(palette['3']).toBe(pp.colors.at(-1)!.slice(0, 7));
  });

  it('sways its necks, and lunges its heads down to attack', () => {
    expect(draw(0, 0)).not.toEqual(draw(1, 0));
    for (const key of LIQUIDS)
      expect(lowest(draw(0, 0.6), key)).toBeGreaterThan(
        lowest(draw(0, 0), key),
      );
  });

  it('gives off acid fumes', () => {
    expect(count(draw(0, 0), 'f')).toBeGreaterThan(4);
  });

  it('splashes into an acid puddle when beaten', () => {
    expect(HYDRA.dust).toEqual({ key: 'D', dir: 1 });
    expect(palette.D).toBeDefined();
  });
});
