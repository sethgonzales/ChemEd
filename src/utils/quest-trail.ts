// Where each door sits across the dungeon map, as a % of its width: the trail
// swings left and right by varying amounts, and ends in the middle at the
// Alchemist's gate.

const SWINGS = [24, 20, 27, 22, 25]; // % from the middle, in turn

/** Door i of n's distance across the map, in % */
export function trailX(i: number, n: number) {
  if (i === n - 1) return 50;
  const side = i % 2 ? 1 : -1;
  return 50 + side * SWINGS[i % SWINGS.length];
}
