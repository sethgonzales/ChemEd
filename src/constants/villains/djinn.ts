import { Painter } from '~/utils/pixel-painter';

// The Pressure Djinn, boss of the gas laws: a spirit of gas uncorked from a
// round-bottomed flask. Like any gas it fills what room it has, so it swells
// as it attacks, the way a gas expands when its pressure on it drops.

const SIZE = 40; // art pixels square
const SWELL = 0.35; // how much bigger it grows at the height of an attack
const BREATH = 0.05; // how much it swells and shrinks as it waits
const BREATH_RATE = 2; // rad/s
const SWIRL_RATE = 3; // rad/s its gas turns
const TAIL = 14; // puffs from the flask's neck up to its body

export const DJINN = {
  name: 'The Pressure Djinn',
  size: SIZE,
  dust: { key: 'D', dir: -1 }, // hisses away as vapour, rising
  palette: {
    K: '#0b0a10', // outline
    G: '#c4b5fd', // the gas it's made of
    g: '#8b5cf6', // its swirls
    H: '#ede9fe', // highlight
    E: '#fde047', // glowing eyes
    k: '#1e1b4b', // open mouth
    F: '#bae6fd', // the flask's glass
    f: '#7dd3fc', // the glass's edge and shine
    C: '#a16207', // the cork
    c: '#713f12', // the cork, shaded
    D: '#ddd6fe', // vapour
  },
  /** t: seconds, for the swirl and breathing; attack: 0 to 1 */
  draw(t: number, attack: number): string[] {
    const p = new Painter(SIZE, SIZE);
    const s = 1 + SWELL * attack + BREATH * Math.sin(t * BREATH_RATE);

    // the flask: a round bottom and a neck, with gas left inside it
    p.ellipse(20, 33, 7.5, 5.8, 'F');
    p.rect(18, 22, 4, 7, 'F');
    p.rect(17, 22, 6, 1, 'f');
    p.ellipse(20, 35, 5.5, 3, 'g', false);
    p.rect(15, 31, 1, 3, 'f', false);
    p.set(16, 30, 'f', false);

    // the cork, popped and resting by the neck, rocking
    const rock = Math.round(Math.sin(t * 1.5) * 0.6);
    p.rect(24, 21 + rock, 3, 2, 'C');
    p.rect(24, 23 + rock, 3, 1, 'c');

    // the tail: puffs curling up out of the neck, wider as they rise
    for (let i = 0; i < TAIL; i++) {
      const u = i / (TAIL - 1);
      const x = 20 + Math.sin(u * 4 + t * 1.5) * 2.5 * u;
      const y = 22 - u * 7 * s;
      p.ellipse(x, y, (1 + u * 2) * s, 1.4, 'G');
    }

    // body and arms, flung wide as it attacks
    // it settles a little as it swells, so its head stays in the frame
    const cy = 15 + (s - 1) * 2;
    p.ellipse(20, cy, 6 * s, 4.5 * s, 'G');
    const reach = 7 * s + attack * 3;
    const raise = attack * 4;
    for (const side of [-1, 1]) {
      p.ellipse(20 + side * reach, cy - 1 - raise, 2.2 * s, 1.8 * s, 'G');
      p.line(20 + side * 5 * s, cy, 20 + side * reach, cy - 1 - raise, 'G');
    }

    // head
    const head = 1 + (s - 1) / 2;
    const hy = cy - 6.2 * s;
    p.ellipse(20, hy, 4.2 * head, 3.8 * head, 'G');

    // its gas swirls: a spiral of darker gas turning inside its body
    for (let y = 0; y < 26; y++)
      for (let x = 0; x < SIZE; x++) {
        const dx = x + 0.5 - 20;
        const dy = y + 0.5 - cy;
        const inside = (dx / (6 * s)) ** 2 + (dy / (4.5 * s)) ** 2 < 0.8;
        const r = Math.hypot(dx, dy);
        const swirl = Math.sin(
          Math.atan2(dy, dx) * 2 + r * 0.7 - t * SWIRL_RATE,
        );
        if (inside && swirl > 0.75 && r > 2) p.set(x, y, 'g', false);
      }
    p.set(17, Math.round(hy) - 2, 'H', false);
    p.set(18, Math.round(hy) - 3, 'H', false);

    // glowing eyes, and a mouth that opens to roar
    const ey = Math.round(hy);
    p.rect(17, ey, 2, 1, 'E', false);
    p.rect(21, ey, 2, 1, 'E', false);
    if (attack) p.ellipse(20, ey + 2.5, 1.6, 1 + attack, 'k', false);
    else p.rect(19, ey + 2, 2, 1, 'g', false);
    return p.rows();
  },
};
