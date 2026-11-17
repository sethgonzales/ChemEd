// The dungeon's back wall: courses of rough stones in staggered rows, with moss
// creeping up from the damp floor. Laid out from a seed so it doesn't shift.

import { createRng } from '~/utils/quest';

// tall enough that a long boss fight on a phone doesn't stretch the stones
export const WALL_WIDTH = 240; // wall units (the SVG's viewBox)
export const WALL_HEIGHT = 300;
const COURSE = 10; // wall units, one row of stones and its mortar
const MORTAR = 1; // wall units between stones
const STONE_MIN = 14; // wall units wide
const STONE_SPAN = 16; // wall units more, at most
export const SHADES = 4; // stone colours to pick from
const MOSS_TOP = 0.04; // chance a stone at the top is mossy
const MOSS_FLOOR = 0.55; // chance one by the floor is

export interface Stone {
  x: number;
  y: number;
  w: number;
  h: number;
  shade: number; // 0 to SHADES - 1
  moss: number; // 0 for none, up to 1 for a stone covered to half its height
}

export function stoneWall(seed: number): { stones: Stone[] } {
  const rng = createRng(seed);
  const stones: Stone[] = [];
  for (let y = 0; y < WALL_HEIGHT; y += COURSE) {
    // start each course part-way through a stone, so joints don't line up
    let x = -Math.floor(rng() * STONE_MIN);
    const damp = (y + COURSE) / WALL_HEIGHT;
    while (x < WALL_WIDTH) {
      const width = STONE_MIN + Math.floor(rng() * STONE_SPAN);
      const left = Math.max(0, x);
      const right = Math.min(WALL_WIDTH, x + width - MORTAR);
      const shade = Math.floor(rng() * SHADES);
      const mossy = rng() < MOSS_TOP + (MOSS_FLOOR - MOSS_TOP) * damp ** 2;
      const moss = mossy ? 0.3 + Math.round(rng() * 7) / 10 : 0;
      if (right > left)
        stones.push({
          x: left,
          y,
          w: right - left,
          h: Math.min(COURSE - MORTAR, WALL_HEIGHT - y),
          shade,
          moss,
        });
      x += width;
    }
  }
  return { stones };
}
