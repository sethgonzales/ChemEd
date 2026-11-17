import { Painter } from '~/utils/pixel-painter';

// The Bond Weaver, boss of Lewis Structures: a spider with a six-membered ring
// on its back, hanging in a web of bond lines with lone pairs caught in it
// like dew.

const SIZE = 40; // art pixels square
const CX = 20; // the web's centre
const CY = 19;
const SPOKES = 8;
const SPOKE_LENGTH = 26; // art pixels, past the grid's edge
const RINGS = [7, 13, 19]; // the web's rings, art pixels from the centre
const TWIST = 0.2; // rad, so no spoke runs straight down the thread
// lone pairs caught in the web: [between spoke k and k + 1, on ring r]
const LONE_PAIRS = [
  [1, 13],
  [3, 19],
  [5, 13],
  [6, 19],
  [4, 19],
];
const RING_RADIUS = 3.6; // art pixels, the ring on its back
const DROP = 3; // art pixels it drops at the height of an attack

const fract = (n: number) => n - Math.floor(n);
const spoke = (k: number) => (k / SPOKES) * Math.PI * 2 + TWIST;

export const WEAVER = {
  name: 'The Bond Weaver',
  size: SIZE,
  dust: { key: 'D', dir: 1 }, // drops, curled up
  palette: {
    K: '#0b0a10', // outline
    w: '#3f4654', // web
    L: '#a3e635', // lone pairs
    R: '#a3e635', // the ring on its back
    T: '#9ca3af', // its thread
    g: '#2d3343', // legs
    B: '#1f2937', // body
    h: '#374151', // shine on its body
    E: '#ef4444', // eyes
    e: '#f87171', // eyes, flickering
    r: '#b91c1c', // its smaller eyes, dim until it attacks
    F: '#e5e7eb', // fangs
    D: '#374151', // dust
  },
  /** t: seconds, for the bob and legs; attack: 0 to 1 as it drops */
  draw(t: number, attack: number): string[] {
    const p = new Painter(SIZE, SIZE);
    // the web: spokes, then rings joining them
    for (let k = 0; k < SPOKES; k++)
      p.line(
        CX,
        CY,
        CX + Math.cos(spoke(k)) * SPOKE_LENGTH,
        CY + Math.sin(spoke(k)) * SPOKE_LENGTH,
        'w',
        false,
      );
    for (const r of RINGS)
      for (let k = 0; k < SPOKES; k++)
        p.line(
          CX + Math.cos(spoke(k)) * r,
          CY + Math.sin(spoke(k)) * r,
          CX + Math.cos(spoke(k + 1)) * r,
          CY + Math.sin(spoke(k + 1)) * r,
          'w',
          false,
        );
    // lone pairs: two dots side by side
    for (const [k, r] of LONE_PAIRS) {
      const a = spoke(k) + 0.25;
      const x = CX + Math.cos(a) * r;
      const y = CY + Math.sin(a) * r;
      p.set(x, y, 'L', false);
      p.set(x + 2, y, 'L', false);
    }

    // the spider, bobbing on its thread
    const by = Math.round(Math.sin(t * 2)) + Math.round(attack * DROP);
    p.line(20, 0, 20, 12 + by, 'T', false);
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++) {
        const wave = Math.sin(t * 6 + i * 1.3 + (side > 0 ? 0 : Math.PI)) * 1.2;
        const knee = [20 + side * (9 + i), 10 + i * 4 + by + wave - attack * 3];
        p.line(20 + side * 3, 17 + i * 2 + by, knee[0], knee[1], 'g');
        p.line(
          knee[0],
          knee[1],
          20 + side * (15 + i * 1.3),
          17 + i * 5 + by,
          'g',
        );
      }
    p.ellipse(20, 25 + by, 7, 6.5, 'B');
    p.ellipse(17.5, 22 + by, 2, 1.5, 'h');
    // a ring of six on its back
    for (let k = 0; k < 6; k++) {
      const a0 = (k / 6) * Math.PI * 2 + Math.PI / 6;
      const a1 = ((k + 1) / 6) * Math.PI * 2 + Math.PI / 6;
      p.line(
        20 + Math.cos(a0) * RING_RADIUS,
        25.5 + by + Math.sin(a0) * RING_RADIUS,
        20 + Math.cos(a1) * RING_RADIUS,
        25.5 + by + Math.sin(a1) * RING_RADIUS,
        'R',
        false,
      );
    }
    // head, six eyes and fangs
    p.ellipse(20, 15.5 + by, 4.5, 3.5, 'B');
    const bright = fract(t) > 0.5 ? 'E' : 'e';
    [
      [18, 14],
      [21, 14],
      [17, 15],
      [22, 15],
      [19, 15],
      [20, 15],
    ].forEach(([x, y], i) => p.set(x, y + by, i < 2 || attack ? bright : 'r'));
    p.rect(19, 18 + by, 1, attack ? 3 : 2, 'F');
    p.rect(21, 18 + by, 1, attack ? 3 : 2, 'F');
    return p.rows();
  },
};
