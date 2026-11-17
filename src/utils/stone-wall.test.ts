import {
  COURSE,
  MIN_OVERLAP,
  TORCH,
  stoneWall,
  wallScale,
  WALL_HEIGHT,
  WALL_WIDTH,
} from './stone-wall';

describe('stoneWall', () => {
  const wall = stoneWall(7);
  const area = wall.stones.reduce((a, s) => a + s.w * s.h, 0);

  it('covers the wall in stones, with only thin mortar between them', () => {
    expect(area / (WALL_WIDTH * WALL_HEIGHT)).toBeGreaterThan(0.8);
    for (const s of wall.stones) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x + s.w).toBeLessThanOrEqual(WALL_WIDTH);
      expect(s.y + s.h).toBeLessThanOrEqual(WALL_HEIGHT);
    }
  });

  // the courses, bottom to top, each as its stones' joints across the wall
  const courses = [...new Set(wall.stones.map((s) => s.y))]
    .sort((a, b) => a - b)
    .map((y) => wall.stones.filter((s) => s.y === y));
  const joints = (course: typeof wall.stones) =>
    course.map((s) => s.x).filter((x) => x > 0);

  it('lays each joint over the middle part of a stone below, as a mason would', () => {
    for (let i = 1; i < courses.length; i++) {
      const below = joints(courses[i - 1]);
      for (const x of joints(courses[i]))
        for (const j of below)
          expect(Math.abs(x - j)).toBeGreaterThanOrEqual(MIN_OVERLAP);
    }
  });

  it('cuts its blocks to much the same length, not random scraps', () => {
    const inner = wall.stones.filter(
      (s) => s.x > 0 && s.x + s.w < WALL_WIDTH, // not trimmed at the edges
    );
    const widths = inner.map((s) => s.w);
    expect(Math.min(...widths)).toBeGreaterThanOrEqual(2 * MIN_OVERLAP - 1);
    expect(Math.max(...widths) / Math.min(...widths)).toBeLessThan(2.5);
  });

  it('shades its stones differently', () => {
    expect(new Set(wall.stones.map((s) => s.shade)).size).toBeGreaterThan(2);
  });

  it('grows moss on some stones, mostly low down where it’s damp', () => {
    const mossy = wall.stones.filter((s) => s.moss > 0);
    expect(mossy.length).toBeGreaterThan(0);
    expect(mossy.length).toBeLessThan(wall.stones.length / 2);
    const low = mossy.filter((s) => s.y > WALL_HEIGHT / 2).length;
    expect(low).toBeGreaterThan(mossy.length - low);
  });

  it('is the same wall every time for the same seed', () => {
    expect(stoneWall(7)).toEqual(wall);
    expect(stoneWall(8)).not.toEqual(wall);
  });
});
describe('the wall’s scale', () => {
  it('is how big a wall unit is drawn, covering the scene however it’s shaped', () => {
    // as the SVG's "slice": the larger of the two fits wins
    expect(wallScale(WALL_WIDTH * 4, 100)).toBe(4); // wide: fit the width
    expect(wallScale(100, WALL_HEIGHT * 5)).toBe(5); // tall: fit the height
  });

  it('gives torches a true size beside the stones: about two courses tall', () => {
    const tall = TORCH.flame.h + TORCH.handle.h;
    expect(tall / COURSE).toBeGreaterThanOrEqual(1.5);
    expect(tall / COURSE).toBeLessThanOrEqual(2.5);
  });
});
