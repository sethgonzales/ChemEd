import { WEAVER } from './weaver';

const { size, palette, draw } = WEAVER;
const count = (rows: string[], key: string) =>
  rows.join('').split(key).length - 1;
// the top row of its body
const bodyTop = (rows: string[]) => rows.findIndex((r) => r.includes('B'));

describe('the Bond Weaver', () => {
  it('fills its grid, in its own colours', () => {
    const rows = draw(0, 0);
    expect(rows).toHaveLength(size);
    for (const row of rows) {
      expect(row).toHaveLength(size);
      for (const p of row) expect(p === '.' || p in palette).toBe(true);
    }
  });

  it('hangs in a web of bond lines, with lone pairs caught in it in twos', () => {
    const rows = draw(0, 0);
    expect(count(rows, 'w')).toBeGreaterThan(60);
    // each lone pair: two dots on one row, a pixel apart
    const pairs = rows.flatMap((row, y) =>
      [...row].flatMap((p, x) =>
        p === 'L' && row[x + 2] === 'L' ? [[x, y]] : [],
      ),
    );
    expect(pairs.length).toBeGreaterThanOrEqual(4);
  });

  it('carries a ring of six on its back', () => {
    expect(count(draw(0, 0), 'R')).toBeGreaterThan(12);
  });

  it('bobs on its thread, and drops when it attacks', () => {
    const tops = new Set<number>();
    for (let t = 0; t < 4; t += 0.2) tops.add(bodyTop(draw(t, 0)));
    expect(tops.size).toBeGreaterThan(1);
    expect(bodyTop(draw(0, 1))).toBeGreaterThan(bodyTop(draw(0, 0)));
  });

  it('opens all its eyes when it attacks', () => {
    const lit = (attack: number) =>
      count(draw(0, attack), 'E') + count(draw(0, attack), 'e');
    expect(lit(1)).toBeGreaterThan(lit(0));
  });

  it('drops, curled up, when beaten', () => {
    expect(WEAVER.dust.key).toBe('D');
    expect(palette.D).toBeDefined();
  });
});
