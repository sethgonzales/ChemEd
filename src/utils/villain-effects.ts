// What happens to a villain when it's hit or beaten, on top of its own drawing

// Sideways steps in art pixels, one per animation frame, after a hit
export const HIT_SHAKE = [2, -2, 2, -1, 1, 0];

/** The flash of a hit: everything white but the outline */
export const hitPalette = (palette: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(palette).map(([k, c]) => [k, k === 'K' ? c : '#ffffff']),
  );

// A steady pseudo-random number for each pixel, so the break-up doesn't jitter
const hash = (n: number) => {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};

const SPREAD = 0.45; // the last pixels start to go this far through
const FALL = 50; // art pixels travelled at full speed
const DRIFT = 16; // art pixels of sideways drift

/**
 * A beaten villain breaking up into its dust: each pixel lets go in its own
 * time, takes on the dust's colour, and falls (dir 1) or rises (dir -1) away.
 * progress runs from 0 (whole) to 1 (gone).
 */
export function defeatRows(
  rows: string[],
  progress: number,
  dir: 1 | -1 | number,
  dust: string,
): string[] {
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  const out = Array.from({ length: height }, () => Array(width).fill('.'));
  rows.forEach((row, y) =>
    [...row].forEach((key, x) => {
      if (key === '.') return;
      const k = y * width + x;
      const q = progress - hash(k) * SPREAD; // how long since it let go
      if (q > 1 - SPREAD - hash(k + 999) * 0.25) return; // faded away
      const nx = q <= 0 ? x : Math.round(x + (hash(k + 333) - 0.5) * q * DRIFT);
      const ny = q <= 0 ? y : Math.round(y + dir * q * q * FALL);
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) return;
      out[ny][nx] = q > 0.08 ? dust : key;
    }),
  );
  return out.map((r) => r.join(''));
}
