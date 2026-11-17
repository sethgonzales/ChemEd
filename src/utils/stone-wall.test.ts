import { stoneWall, WALL_HEIGHT, WALL_WIDTH } from './stone-wall';

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

  it('staggers the joints from one course of stones to the next', () => {
    const joints = (y: number) =>
      new Set(wall.stones.filter((s) => s.y === y).map((s) => s.x));
    const courses = [...new Set(wall.stones.map((s) => s.y))].sort(
      (a, b) => a - b,
    );
    const [a, b] = [joints(courses[0]), joints(courses[1])];
    const shared = [...b].filter((x) => x > 0 && a.has(x));
    expect(shared.length).toBeLessThan(b.size / 2);
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
