// The dungeon's back wall: courses of rough stones in staggered rows, with moss
// creeping up from the damp floor. Laid out from a seed so it doesn't shift.

import { createRng } from '~/utils/quest';

// tall enough that a long boss fight on a phone doesn't stretch the stones
export const WALL_WIDTH = 240; // wall units (the SVG's viewBox)
export const WALL_HEIGHT = 300;
export const COURSE = 10; // wall units, one row of stones and its mortar
export const MIN_OVERLAP = 6; // wall units a stone must bridge past a joint below
const MORTAR = 1; // wall units between stones
const BLOCK = 24; // wall units, a block's usual length
const BLOCK_SPREAD = 5; // wall units longer or shorter, at most, in the first course
const JITTER = 3; // wall units a joint may stray from the middle of the stone below
export const SHADES = 4; // stone colours to pick from
const MOSS_TOP = 0.04; // chance a stone at the top is mossy
const MOSS_FLOOR = 0.55; // chance one by the floor is

// a wall torch, in wall units: a flame on a handle, about two courses tall
export const TORCH = {
  flame: { w: 5, h: 8 },
  handle: { w: 1.5, h: 10 },
  inset: 8, // from the scene's edge
};

/**
 * Pixels per wall unit for a scene of this size: the wall covers it like the
 * SVG's "slice", so the larger of the two fits wins
 */
export const wallScale = (width: number, height: number) =>
  Math.max(width / WALL_WIDTH, height / WALL_HEIGHT);

export interface Stone {
  x: number;
  y: number;
  w: number;
  h: number;
  shade: number; // 0 to SHADES - 1
  moss: number; // 0 for none, up to 1 for a stone covered to half its height
}

/**
 * The joints of the course above: one over the middle of each stone below
 * (a running bond), nudged a little so it looks hand-laid, but never closer
 * than MIN_OVERLAP to a joint beneath
 */
function nextJoints(below: number[], rng: () => number) {
  // a stone beyond each end, so the course still reaches the wall's edges
  const ext = [below[0] - BLOCK, ...below, below.at(-1)! + BLOCK];
  const out: number[] = [];
  for (let i = 0; i + 1 < ext.length; i++) {
    const half = (ext[i + 1] - ext[i]) / 2;
    const room = Math.max(0, Math.min(JITTER, half - MIN_OVERLAP));
    out.push(Math.round(ext[i] + half + (rng() * 2 - 1) * room));
  }
  return out.filter((x) => x < WALL_WIDTH + BLOCK);
}

export function stoneWall(seed: number): { stones: Stone[] } {
  const rng = createRng(seed);
  const stones: Stone[] = [];
  // the bottom course sets the pattern, laid from just off the left edge
  let joints: number[] = [];
  for (let x = -Math.floor(rng() * BLOCK); x < WALL_WIDTH + BLOCK; ) {
    joints.push(x);
    x += BLOCK + Math.round((rng() * 2 - 1) * BLOCK_SPREAD);
  }
  for (let y = WALL_HEIGHT - COURSE; y > -COURSE; y -= COURSE) {
    const damp = (y + COURSE) / WALL_HEIGHT;
    for (let i = 0; i + 1 < joints.length; i++) {
      const left = Math.max(0, joints[i]);
      const right = Math.min(WALL_WIDTH, joints[i + 1] - MORTAR);
      const shade = Math.floor(rng() * SHADES);
      const mossy = rng() < MOSS_TOP + (MOSS_FLOOR - MOSS_TOP) * damp ** 2;
      const moss = mossy ? 0.3 + Math.round(rng() * 7) / 10 : 0;
      const top = Math.max(0, y);
      if (right > left)
        stones.push({
          x: left,
          y: top,
          w: right - left,
          h: y + COURSE - MORTAR - top,
          shade,
          moss,
        });
    }
    joints = nextJoints(joints, rng);
  }
  return { stones };
}
