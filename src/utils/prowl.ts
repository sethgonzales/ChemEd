// A boss prowling its room while it waits for the answer: swaying from side
// to side, stalking closer (drawn bigger, lower down the floor), backing off
// toward the far wall (smaller, back up to the floor line it stands on, never
// above it), and rushing right up when it attacks.

export const PROWL_PERIOD = 7; // s, for one stalk in and back
const FAR = 0.78; // scale at the far wall
const NEAR = 1.08; // scale at its closest
const SWAY = 14; // art pixels to either side
const DROP = 6; // art pixels down the floor at its closest
const RUSH_DROP = 9; // and at the height of an attack
const RUSH = 0.35; // extra scale at the height of an attack

export interface Stance {
  x: number; // art pixels from the middle
  y: number; // art pixels down the floor from its floor line, never above
  scale: number;
}

const round = (from: number, to: number, k: number) =>
  Math.round((from + (to - from) * k) * 100) / 100;

/** Where a boss stands t s into its prowl, attacking from 0 to 1 */
export function stance(t: number, attack: number): Stance {
  const phase = ((t % PROWL_PERIOD) / PROWL_PERIOD) * 2 * Math.PI;
  const close = (1 - Math.cos(phase)) / 2; // 0 at the far wall, 1 up close
  return {
    // two sways for each stalk in and back, so it circles rather than paces
    x: Math.round(SWAY * Math.sin(phase * 2) * (1 - attack)),
    y: Math.round(DROP * close + (RUSH_DROP - DROP * close) * attack),
    // an attack blends from wherever it was to right up close
    scale: round(FAR + (NEAR - FAR) * close, NEAR + RUSH, attack),
  };
}
