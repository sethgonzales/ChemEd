import type { AreaKind, Leg } from '~/constants/balloon-world';

// The world of one leg, in art pixels, at one scale both ways so a mountain
// looks as tall as it is. The balloon is small in it, and the camera follows.

export const M_PER_PX = 5; // m of world per art pixel
const MARGIN = 700; // m of country beyond each platform
export const SKY_ROOM = 1200; // m of sky above the higher platform, room to overshoot
const UNDERGROUND = 80; // m of ground drawn under the valley floor
const AREA = 350; // m: half the flat width of a platform's area
const RULER_STEP = 100; // m between ruler marks

// how far the land takes to fall from an area to the valley, m; a mesa ends
// in cliffs, a field rolls gently away
const SLOPE: Record<AreaKind, number> = {
  field: 900,
  mesa: 160,
  lookout: 700,
  ridge: 1100,
};

// a tower stands on its hill: the ground is this far below where you land, m
export const STRUCTURE: Record<AreaKind, number> = {
  field: 0,
  mesa: 0,
  lookout: 60,
  ridge: 0,
};

const top = (leg: Leg) => Math.max(leg.from.height, leg.to.height) + SKY_ROOM;
const left = (leg: Leg) => leg.from.distance - MARGIN;

// eases from 0 to 1, so slopes start and end gently
const smooth = (t: number) => t * t * (3 - 2 * t);

/** The ground's height (m) at a distance along the leg */
export function groundAt(leg: Leg, distance: number): number {
  const rise = ({ distance: at, height, kind }: Leg['from']) => {
    const ground = height - STRUCTURE[kind];
    const off = Math.max(0, Math.abs(distance - at) - AREA) / SLOPE[kind];
    return off >= 1
      ? leg.valley
      : leg.valley + (ground - leg.valley) * (1 - smooth(off));
  };
  return Math.max(leg.valley, rise(leg.from), rise(leg.to));
}

export const worldX = (leg: Leg, distance: number) =>
  (distance - left(leg)) / M_PER_PX;

export const worldY = (leg: Leg, height: number) =>
  (top(leg) - height) / M_PER_PX;

/** The distance (m) at a world x, the inverse of worldX */
export const distanceAt = (leg: Leg, x: number) => left(leg) + x * M_PER_PX;

export function worldSize(leg: Leg) {
  return {
    width: worldX(leg, leg.to.distance + MARGIN),
    height: worldY(leg, leg.valley - UNDERGROUND),
  };
}

interface Box {
  width: number;
  height: number;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), Math.max(lo, hi));

const GROUND_LINE = 0.85; // how far down the view the land sits, when it can
const HEADROOM = 48; // art px kept clear above the basket, for the envelope

/**
 * The camera's top-left corner, following the balloon at `at` (world px).
 * It sits a little left of centre, so you see where you're headed. It keeps
 * the land below in view, so you watch it pass, and rises only when the
 * balloon would leave the top. It never looks past the world's edges.
 */
export function camera(leg: Leg, view: Box, at: { x: number; y: number }) {
  const world = worldSize(leg);
  const ground = worldY(leg, groundAt(leg, distanceAt(leg, at.x)));
  const y = Math.min(ground - view.height * GROUND_LINE, at.y - HEADROOM);
  return {
    x: clamp(at.x - view.width * 0.35, 0, world.width - view.width),
    y: clamp(y, 0, world.height - view.height),
  };
}

/** The ruler's marks in a window of the world, from the top down */
export function rulerMarks(leg: Leg, window: { y: number; height: number }) {
  const highest = top(leg) - window.y * M_PER_PX;
  const lowest = top(leg) - (window.y + window.height) * M_PER_PX;
  const marks: { height: number; y: number }[] = [];
  for (
    let h = Math.floor(highest / RULER_STEP) * RULER_STEP;
    h >= lowest - 1e-6;
    h -= RULER_STEP
  )
    marks.push({ height: h, y: worldY(leg, h) });
  return marks;
}
