import { columnsFor, mapLayout, trailPath } from './quest-trail';

describe('the map’s layout', () => {
  it('fits two doors a row on a phone, three or four on wider screens', () => {
    expect(columnsFor(358)).toBe(2);
    expect(columnsFor(560)).toBe(3);
    expect(columnsFor(1100)).toBe(4);
    expect(columnsFor(3000)).toBe(4);
  });

  it('snakes across the rows: left to right, then back right to left', () => {
    const { stops, rows } = mapLayout(7, 3);
    expect(rows).toBe(3);
    expect(stops.map((s) => s.col)).toEqual([0, 1, 2, 2, 1, 0, 0]);
    expect(stops.map((s) => s.row)).toEqual([0, 0, 0, 1, 1, 1, 2]);
  });

  it('puts each stop in its column, across the map', () => {
    const { stops } = mapLayout(4, 4);
    expect(stops.map((s) => s.x)).toEqual([12.5, 37.5, 62.5, 87.5]);
  });

  it('curves each row, so the doors don’t sit on a straight line', () => {
    const { stops } = mapLayout(4, 4);
    const ys = stops.map((s) => s.y);
    expect(new Set(ys).size).toBeGreaterThan(1);
    for (const y of ys) {
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(1);
    }
  });
});

describe('the trail between two stops', () => {
  it('runs from one to the other', () => {
    const { stops } = mapLayout(2, 3);
    const d = trailPath(stops[0], stops[1], 3);
    expect(d.startsWith(`M ${stops[0].x} ${stops[0].y}`)).toBe(true);
    expect(d.endsWith(`${stops[1].x} ${stops[1].y}`)).toBe(true);
  });

  it('swings out past the edge door at the end of a row, turning down to the next', () => {
    const { stops } = mapLayout(4, 3);
    const d = trailPath(stops[2], stops[3], 3);
    const xs = d
      .match(/-?[\d.]+/g)!
      .map(Number)
      .filter((_, i) => i % 2 === 0);
    expect(Math.max(...xs)).toBeGreaterThan(stops[2].x);
  });
});
