import { Painter } from '~/utils/pixel-painter';

// The Frost Wyrm, boss of States of Matter: an ice dragon coiled in falling
// snow. It breathes frost when it attacks, and when beaten it sublimes
// straight to vapour, rising away as steam.

const SIZE = 40; // art pixels square
const FLAKES = 7;
const SNOW_SPEED = 0.12; // grid heights a second
const SWAY = 3; // art pixels the coil sways
const BREATH = 16; // frost specks at the height of an attack

const fract = (n: number) => n - Math.floor(n);
// a steady pseudo-random number, so the snow and frost don't jitter
const hash = (n: number) => fract(Math.sin(n * 12.9898 + 78.233) * 43758.5453);

export const WYRM = {
  name: 'The Frost Wyrm',
  size: SIZE,
  dust: { key: 'D', dir: -1 }, // steams away
  palette: {
    K: '#0b0a10', // outline
    I: '#7dd3fc', // ice
    b: '#bae6fd', // belly
    L: '#e0f2fe', // frost on its spines and horns
    J: '#0284c7', // the dark of its jaw
    E: '#22d3ee', // eye
    w: '#ffffff', // eye, attacking
    S: '#e0f2fe', // snowflakes
    s: '#93c5fd', // their arms
    F: '#ffffff', // frost breath
    f: '#e0f2fe', // and its paler specks
    D: '#e0f2fe', // steam
  },
  /** t: seconds, for the snow and sway; attack: 0 to 1 as it breathes */
  draw(t: number, attack: number): string[] {
    const p = new Painter(SIZE, SIZE);
    for (let k = 0; k < FLAKES; k++) {
      const x = 4 + hash(k) * 32;
      const y = fract(hash(k + 9) + t * SNOW_SPEED) * 44 - 3;
      p.set(x, y, 'S', false);
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ])
        p.set(x + dx, y + dy, 's', false);
    }

    // its body: a swaying coil from the tail on the floor up to the head,
    // thickest in the middle
    const at = (s: number) => ({
      x: 30 - 18 * s + Math.sin(s * Math.PI * 2 + t * 2) * SWAY,
      y: 37 - 26 * s,
      r:
        1.6 +
        3.2 * Math.sin(Math.min(1, s * 1.15) * Math.PI) +
        (s > 0.85 ? 0.6 : 0),
    });
    for (let s = 0; s <= 1.0001; s += 0.03) {
      const c = at(s);
      p.ellipse(c.x, c.y, c.r, c.r, 'I');
    }
    for (let s = 0.08; s <= 0.85; s += 0.03) {
      const c = at(s);
      p.ellipse(c.x - c.r * 0.45, c.y, c.r * 0.45, c.r * 0.5, 'b');
    }
    for (let s = 0.12; s < 0.85; s += 0.12) {
      const c = at(s);
      p.line(c.x + c.r - 0.5, c.y, c.x + c.r + 2, c.y - 2, 'L');
    }

    // head, jaw dropping open as it attacks, and horns
    const head = at(1);
    const hx = head.x;
    const hy = head.y + 1;
    p.ellipse(hx, hy - 2, 5, 4, 'I');
    p.rect(hx - 9, hy - 4, 6, 3, 'I');
    p.rect(hx - 8, hy - 1 + Math.round(attack * 3), 6, 2, 'J');
    p.rect(hx - 9, hy - 2, 1, 1, 'J');
    p.rect(hx - 1, hy - 4, 2, 1, attack ? 'w' : 'E');
    p.line(hx + 1, hy - 5, hx + 4, hy - 10, 'L');
    p.line(hx + 3, hy - 4, hx + 7, hy - 8, 'L');

    // frost breath, pouring down from its jaw in a widening cone
    if (attack > 0.15)
      for (let k = 0; k < BREATH * attack; k++) {
        const spread = k * 0.45;
        p.set(
          hx - 7 + (hash(k + Math.floor(t * 10)) - 0.5) * spread,
          hy + 2 + k * 1.3,
          k % 3 ? 'f' : 'F',
          false,
        );
      }
    return p.rows();
  },
};
