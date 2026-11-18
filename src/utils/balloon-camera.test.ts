import type { Leg } from '~/constants/balloon-world';
import {
  M_PER_PX,
  camera,
  groundAt,
  rulerMarks,
  worldSize,
  worldX,
  worldY,
} from './balloon-camera';

const leg: Leg = {
  from: { name: 'Launch field', kind: 'field', distance: 0, height: 200 },
  to: { name: 'Red Mesa', kind: 'mesa', distance: 5000, height: 800 },
  valley: 150,
};

describe('groundAt (the land along a leg)', () => {
  it('is the platform’s own height across its area', () => {
    expect(groundAt(leg, 0)).toBe(200);
    expect(groundAt(leg, 5000)).toBe(800);
  });

  it('dips to the valley floor between the two', () => {
    expect(groundAt(leg, 2500)).toBe(150);
    for (let d = 0; d <= 5000; d += 100) {
      expect(groundAt(leg, d)).toBeGreaterThanOrEqual(150);
    }
  });
});

describe('the world’s scale', () => {
  it('uses one scale both ways, so mountains look as tall as they are', () => {
    const { width, height } = worldSize(leg);
    expect(width).toBeGreaterThan(5000 / M_PER_PX);
    expect(height).toBeGreaterThan(800 / M_PER_PX);
    expect(worldX(leg, 1000) - worldX(leg, 0)).toBeCloseTo(1000 / M_PER_PX, 9);
    expect(worldY(leg, 0) - worldY(leg, 1000)).toBeCloseTo(1000 / M_PER_PX, 9);
  });

  it('is big enough that the leg takes several screens to cross', () => {
    expect(worldSize(leg).width).toBeGreaterThan(3 * 400);
  });
});

describe('camera', () => {
  const view = { width: 400, height: 200 };

  it('keeps the balloon in view, a little left of centre so you see ahead', () => {
    const at = { x: 700, y: 150 };
    const c = camera(leg, view, at);
    expect(at.x).toBeGreaterThan(c.x);
    expect(at.x).toBeLessThan(c.x + view.width / 2);
    expect(at.y).toBeGreaterThan(c.y);
    expect(at.y).toBeLessThan(c.y + view.height);
  });

  it('keeps the land below in view while there’s room, so you see it pass', () => {
    // mid-leg, 300 m above the valley floor
    const at = { x: worldX(leg, 2500), y: worldY(leg, 450) };
    const c = camera(leg, view, at);
    const ground = worldY(leg, groundAt(leg, 2500));
    expect(ground).toBeGreaterThan(c.y);
    expect(ground).toBeLessThan(c.y + view.height);
  });

  it('rises with the balloon once it climbs too high to show both', () => {
    const at = { x: worldX(leg, 2500), y: worldY(leg, 1000) };
    const c = camera(leg, view, at);
    expect(at.y - 40).toBeGreaterThan(c.y); // its envelope, above the basket
  });

  it('never looks past the edges of the world', () => {
    const { width, height } = worldSize(leg);
    const start = camera(leg, view, { x: 0, y: height });
    expect(start.x).toBe(0);
    expect(start.y).toBeLessThanOrEqual(height - view.height);
    const end = camera(leg, view, { x: width, y: 0 });
    expect(end.x).toBe(width - view.width);
    expect(end.y).toBe(0);
  });
});

describe('rulerMarks', () => {
  it('marks every 100 m that’s in view', () => {
    // a window from 950 m down to 800 m
    const marks = rulerMarks(leg, {
      y: worldY(leg, 950),
      height: 150 / M_PER_PX,
    });
    expect(marks.map((m) => m.height)).toEqual([900, 800]);
    expect(marks[0].y).toBeCloseTo(worldY(leg, 900), 9);
  });
});
