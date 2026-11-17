import { trailX } from './quest-trail';

describe('the map’s trail', () => {
  const xs = (n: number) => Array.from({ length: n }, (_, i) => trailX(i, n));

  it('winds from side to side, so it reads as a path, not a stack', () => {
    for (const n of [3, 5, 9]) {
      const path = xs(n);
      for (let i = 1; i < n; i++)
        expect(Math.abs(path[i] - path[i - 1])).toBeGreaterThanOrEqual(15);
    }
  });

  it('keeps every door clear of the edges', () => {
    for (const x of xs(9)) {
      expect(x).toBeGreaterThanOrEqual(22);
      expect(x).toBeLessThanOrEqual(78);
    }
  });

  it('ends at the middle, at the Alchemist’s gate', () => {
    expect(trailX(4, 5)).toBe(50);
    expect(trailX(1, 2)).toBe(50);
  });
});
