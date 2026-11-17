import { Painter } from '~/utils/pixel-painter';

// The Orbital Lich, boss of Electron Configurations: a hooded skeleton circled
// by an s orbital (a sphere, with its two electrons) and a turning p orbital,
// whose two lobes are drawn in two colours for the wavefunction's two signs.

const SIZE = 40; // art pixels square
const S_RADIUS = 16; // art pixels
const S_DOTS = 64; // dots round the sphere's edge, every other one drawn
const ELECTRON_SPEED = 2; // rad/s
const P_SPEED = 1.2; // rad/s the p orbital turns
const GLOW_RATE = 0.8; // eye flickers a second

const fract = (n: number) => n - Math.floor(n);

export const LICH = {
  name: 'The Orbital Lich',
  size: SIZE,
  dust: { key: 'D', dir: 1 }, // falls to bone dust
  palette: {
    K: '#0b0a10', // outline
    R: '#3b1f5c', // robe
    r: '#58307f', // robe, lit
    b: '#e8e2cf', // bone
    k: '#140a1f', // the dark of its eyes and teeth
    s: '#6d28d9', // the s orbital
    W: '#ffffff', // its electrons
    P: '#38bdf8', // one lobe of the p orbital
    N: '#f472b6', // the other, of opposite sign
    E: '#c084fc', // eyes
    e: '#a855f7', // eyes, flickering
    w: '#ffffff', // eyes, attacking
    D: '#e8e2cf', // bone dust
  },
  /** t: seconds, for the orbitals and flicker; attack: 0 to 1 as it lunges */
  draw(t: number, attack: number): string[] {
    const p = new Painter(SIZE, SIZE);
    // the s orbital: a dotted sphere with its two electrons going round
    for (let k = 1; k < S_DOTS; k += 2) {
      const a = (k / S_DOTS) * Math.PI * 2;
      p.set(
        20 + Math.cos(a) * S_RADIUS,
        18 + Math.sin(a) * S_RADIUS,
        's',
        false,
      );
    }
    const e = -t * ELECTRON_SPEED;
    for (const o of [0, Math.PI])
      p.rect(
        20 + Math.cos(e + o) * S_RADIUS - 0.5,
        18 + Math.sin(e + o) * S_RADIUS - 0.5,
        2,
        2,
        'W',
        false,
      );

    // the p orbital: two lobes either side of the nucleus, spinning faster
    // and further out as it attacks
    const turn = t * P_SPEED + attack * 8;
    const d = 8 + attack * 2;
    const lobe = (side: number, key: string) =>
      p.rotatedEllipse(
        20 + side * Math.cos(turn) * d,
        15 + side * Math.sin(turn) * d,
        6 + attack,
        3,
        turn,
        key,
      );
    // the lobe swinging low passes in front of it, the high one behind
    const front = Math.sin(turn) > 0 ? 1 : -1;
    lobe(-front, front > 0 ? 'N' : 'P');

    // robe, widening to a ragged hem that ripples
    for (let y = 18; y < 38; y++) {
      const w = 5 + (y - 18) * 0.55;
      p.rect(Math.round(20 - w), y, Math.round(w * 2), 1, 'R');
    }
    for (let x = 9; x < 31; x++)
      if ((x + Math.floor(t * 5)) % 3) p.set(x, 38, 'R');
    p.rect(19, 21, 2, 16, 'r');
    // sleeves and bony hands, bobbing
    const bob = Math.sin(t * 2) * 0.8;
    p.ellipse(11, 23, 3, 2.5, 'r');
    p.ellipse(29, 23, 3, 2.5, 'r');
    p.ellipse(9, 25 + bob, 2, 1.5, 'b');
    p.ellipse(31, 25 - bob, 2, 1.5, 'b');
    // hood and skull
    p.ellipse(20, 13, 8, 9, 'R');
    p.ellipse(20, 13, 5, 5.5, 'b');
    p.rect(17, 17, 6, 2, 'b');
    [18, 20, 22].forEach((x) => p.set(x, 18, 'k'));
    p.rect(17, 12, 2, 2, 'k');
    p.rect(21, 12, 2, 2, 'k');
    const glow = attack ? 'w' : fract(t * GLOW_RATE) > 0.5 ? 'E' : 'e';
    p.set(17, 12, glow);
    p.set(22, 12, glow);
    p.set(20, 15, 'k');
    lobe(front, front > 0 ? 'P' : 'N');
    return p.rows();
  },
};
