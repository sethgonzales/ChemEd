import { Painter } from './pixel-painter';

const at = (rows: string[], x: number, y: number) => rows[y][x];

describe('Painter', () => {
  it('starts as an empty, see-through grid', () => {
    const rows = new Painter(6, 4).rows();
    expect(rows).toEqual(Array(4).fill('......'));
  });

  it('outlines what it paints on all four sides, but not the corners', () => {
    const p = new Painter(5, 5);
    p.set(2, 2, 'R');
    const rows = p.rows();
    expect(at(rows, 2, 2)).toBe('R');
    for (const [x, y] of [
      [1, 2],
      [3, 2],
      [2, 1],
      [2, 3],
    ]) {
      expect(at(rows, x, y)).toBe('K');
    }
    expect(at(rows, 1, 1)).toBe('.');
  });

  it('leaves out the outline for fine details like web threads', () => {
    const p = new Painter(5, 5);
    p.set(2, 2, 'w', false);
    expect(p.rows().join('').replace(/\./g, '')).toBe('w');
  });

  it('fills rectangles and ellipses', () => {
    const p = new Painter(12, 12);
    p.rect(1, 1, 3, 2, 'R');
    p.ellipse(8, 8, 2, 2, 'B');
    const rows = p.rows();
    expect(rows[1].slice(1, 4)).toBe('RRR');
    expect(rows[2].slice(1, 4)).toBe('RRR');
    expect(at(rows, 8, 8)).toBe('B');
    expect(at(rows, 7, 7)).toBe('B');
  });

  it('draws a line between two points', () => {
    const p = new Painter(10, 10);
    p.line(1, 1, 7, 4, 'L', false);
    const rows = p.rows();
    expect(at(rows, 1, 1)).toBe('L');
    expect(at(rows, 7, 4)).toBe('L');
    expect(rows.join('').split('L').length - 1).toBe(7); // one per column
  });

  it('ignores anything painted off the grid', () => {
    const p = new Painter(4, 4);
    p.set(-1, 0, 'R');
    p.set(9, 9, 'R');
    expect(p.rows()).toEqual(Array(4).fill('....'));
  });
});
