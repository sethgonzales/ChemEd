// A boss prowling its room while it waits for the answer: swaying from side
// to side, stalking closer (drawn bigger, lower down), backing off toward the
// far wall (smaller, higher up), and rushing right up when it attacks.

export const PROWL_PERIOD = 7; // s, for one stalk in and back
const FAR = 0.78; // scale at the far wall
const NEAR = 1.08; // scale at its closest
const SWAY = 14; // art pixels to either side
const RISE = 10; // art pixels higher up at the far wall
const RUSH = 0.35; // extra scale at the height of an attack

export interface Stance {
  x: number; // art pixels from the middle
  y: number; // art pixels down (negative: up, toward the far wall)
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
    y: Math.round(-RISE * (1 - close) * (1 - attack)),
    // an attack blends from wherever it was to right up close
    scale: round(FAR + (NEAR - FAR) * close, NEAR + RUSH, attack),
  };
}
