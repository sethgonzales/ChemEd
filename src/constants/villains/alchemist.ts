import { BLOCK_COLORS } from '~/constants/blocks';
import { INDICATORS } from '~/constants/titrations';
import { Painter } from '~/utils/pixel-painter';

// The Alchemist, the final boss: it wears a piece of every chamber. An orbital
// circles its hood, its hem is a row of element tiles in the block colours,
// its staff is topped with the Sphinx's glowing tile, and its flask turns
// through the indicators' colours (from the lab's cited indicator data).

const SIZE = 40; // art pixels square
const RING_DOTS = 80;
const RING = { rx: 12, ry: 3.5, cy: 11 }; // art pixels, the orbital's ellipse
const ELECTRON_SPEED = 2.5; // rad/s
const COLOUR_RATE = 0.8; // flask colours a second
const RAISE = 6; // art pixels the flask lifts as it attacks
const FLASK = { x: 30, y: 24, r: 3.5 }; // art pixels

const fract = (n: number) => n - Math.floor(n);

// every colour the indicators take, once each, as one-letter palette keys
const LIQUID_COLOURS = [
  ...new Set(INDICATORS.flatMap((i) => i.colors.map((c) => c.slice(0, 7)))),
];
const LIQUIDS = LIQUID_COLOURS.map((_, i) => String.fromCharCode(97 + i)); // a, b, …

export const ALCHEMIST = {
  name: 'The Alchemist',
  size: SIZE,
  dust: { key: 'D', dir: -1 }, // vanishes in purple smoke
  liquids: LIQUIDS,
  palette: {
    K: '#0b0a10', // outline
    R: '#1e1b2e', // robe
    l: '#2a2540', // robe, lit
    H: '#2e1065', // hood and sleeves
    S: '#0c0a14', // shadow under the hood
    o: '#c084fc', // the orbital
    W: '#ffffff', // its electron
    T: '#78350f', // staff
    Y: '#facc15', // the staff's tile, glowing
    y: '#fde68a', // and flickering
    E: '#facc15', // eyes
    r: '#ef4444', // eyes, attacking
    h: '#d6c7b0', // hand
    g: '#e2e8f0', // glass
    '1': BLOCK_COLORS.s, // the hem of element tiles
    '2': BLOCK_COLORS.p,
    '3': BLOCK_COLORS.d,
    '4': BLOCK_COLORS.f,
    ...Object.fromEntries(LIQUIDS.map((k, i) => [k, LIQUID_COLOURS[i]])),
    D: '#a855f7', // purple smoke
  } as Record<string, string>,
  /** t: seconds, for the orbital, glow and flask; attack: 0 to 1 */
  draw(t: number, attack: number): string[] {
    const p = new Painter(SIZE, SIZE);
    // the orbital: its back half behind the Alchemist, its front half before
    const ring = (front: boolean) => {
      for (let k = 0; k < RING_DOTS; k++) {
        const a = (k / RING_DOTS) * Math.PI * 2;
        if (Math.sin(a) > 0 === front)
          p.set(
            20 + Math.cos(a) * RING.rx,
            RING.cy + Math.sin(a) * RING.ry,
            'o',
            false,
          );
      }
      const e = t * ELECTRON_SPEED;
      if (Math.sin(e) > 0 === front)
        p.rect(
          20 + Math.cos(e) * RING.rx - 0.5,
          RING.cy + Math.sin(e) * RING.ry - 0.5,
          2,
          2,
          'W',
          false,
        );
    };
    ring(false);

    // staff, topped with a glowing tile
    p.line(8, 7, 8, 39, 'T');
    p.rect(7, 4, 3, 3, fract(t) > 0.5 ? 'Y' : 'y');
    // robe, its hem of element tiles
    for (let y = 16; y < 40; y++) {
      const w = 6 + (y - 16) * 0.45;
      p.rect(Math.round(20 - w), y, Math.round(w * 2), 1, 'R');
    }
    for (let x = 9; x < 31; x++)
      p.rect(x, 36, 1, 2, String((Math.floor(x / 2) % 4) + 1));
    p.rect(19, 19, 2, 17, 'l');
    // hood, face in shadow, eyes
    p.ellipse(20, 12, 7, 8, 'H');
    p.rect(19, 3, 2, 2, 'H');
    p.ellipse(20, 13, 4, 5, 'S');
    const eye = attack ? 'r' : fract(t * 0.7) > 0.15 ? 'E' : 'S'; // a blink
    p.set(18, 12, eye);
    p.set(21, 12, eye);
    // the hand on the staff
    p.ellipse(11.5, 23, 3, 2.5, 'H');
    p.set(9, 23, 'h');

    // the flask, raised to attack, its colour turning
    const fy = FLASK.y - Math.round(attack * RAISE);
    const liquid = LIQUIDS[Math.floor(t * COLOUR_RATE) % LIQUIDS.length];
    p.ellipse(27, fy, 3, 2.5, 'H');
    p.rect(FLASK.x, fy - 6, 2, 3, 'g');
    p.ellipse(FLASK.x + 1, fy, FLASK.r, FLASK.r, 'g');
    p.ellipse(FLASK.x + 1, fy + 1, FLASK.r - 1, FLASK.r - 1.5, liquid, false);
    // vapour rising from its neck
    for (let k = 0; k < 3; k++) {
      const f = fract(t * 0.9 + k / 3);
      p.set(
        FLASK.x + 1 + Math.sin(f * 7 + k) * 1.3,
        fy - 7 - f * 7,
        liquid,
        false,
      );
    }
    ring(true);
    return p.rows();
  },
};
