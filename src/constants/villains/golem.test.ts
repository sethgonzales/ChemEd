import { GOLEM } from './golem';

const { size, palette, draw } = GOLEM;

// [x, y] of every pixel with this key
const where = (rows: string[], key: string) =>
  rows.flatMap((row, y) =>
    [...row].flatMap((p, x) => (p === key ? [[x, y]] : [])),
  );

// the top of each pan, left and right
function panHeights(rows: string[]) {
  const pans = where(rows, 'P');
  const left = pans.filter(([x]) => x < size / 2).map(([, y]) => y);
  const right = pans.filter(([x]) => x >= size / 2).map(([, y]) => y);
  return { left: Math.min(...left), right: Math.min(...right) };
}

describe('the Unbalanced Golem', () => {
  it('fills its grid, in its own colours', () => {
    const rows = draw(0, 0);
    expect(rows).toHaveLength(size);
    for (const row of rows) {
      expect(row).toHaveLength(size);
      for (const p of row) expect(p === '.' || p in palette).toBe(true);
    }
  });

  it('is a heap of boulders in four colours', () => {
    const rows = draw(0, 0).join('');
    for (const boulder of ['C', 'O', 'H', 'N']) expect(rows).toContain(boulder);
  });

  it('sways, but its scale never levels: the heavier pan always hangs lower', () => {
    const seen = new Set<string>();
    for (let t = 0; t < 10; t += 0.1) {
      const rows = draw(t, 0);
      const { left, right } = panHeights(rows);
      expect(right).toBeGreaterThan(left);
      seen.add(rows.join());
    }
    expect(seen.size).toBeGreaterThan(5);
  });

  it('holds more atoms in its heavier pan', () => {
    const { pans } = GOLEM;
    expect(pans.right).toBeGreaterThan(pans.left);
  });

  it('glares red when it attacks', () => {
    expect(where(draw(0, 0), 'e').length).toBe(0);
    expect(where(draw(0, 1), 'e').length).toBeGreaterThan(0);
  });

  it('scatters into loose atoms when beaten', () => {
    expect(GOLEM.dust).toEqual({ key: 'D', dir: 1 });
    expect(palette.D).toBeDefined();
  });
});
