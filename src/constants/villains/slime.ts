import { Painter } from '~/utils/pixel-painter';

// The Precipitate Slime, boss of Chemical Reactions: a clear ooze with a
// yellow solid forming inside it, the way a precipitate clouds a mix of two
// clear solutions and settles to the bottom. It spits a glob of it to attack.

const SIZE = 40; // art pixels square
const SPECKS = 18; // grains of precipitate falling through it
const SQUASH = 1.2; // art pixels it squashes and stretches
const SQUASH_RATE = 2.5; // rad/s
const SPIT = 18; // art pixels the glob flies at the height of an attack

const fract = (n: number) => n - Math.floor(n);
// a steady pseudo-random number, so the precipitate doesn't jitter
const hash = (n: number) => fract(Math.sin(n * 12.9898 + 78.233) * 43758.5453);

export const SLIME = {
  name: 'The Precipitate Slime',
  size: SIZE,
  dust: { key: 'D', dir: 1 }, // collapses into yellow sludge
  palette: {
    K: '#0b0a10', // outline
    L: '#a5f3fc', // the clear ooze
    l: '#67e8f9', // its edge on the floor
    H: '#ecfeff', // shine
    P: '#facc15', // precipitate
    p: '#ca8a04', // darker grains of it
    k: '#0f172a', // eyes and open mouth
    W: '#ffffff', // the glint in its eyes
    m: '#0e7490', // its closed mouth
    G: '#facc15', // the glob it spits
    D: '#facc15', // sludge
  },
  /** t: seconds, for the wobble and the falling solid; attack: 0 to 1 */
  draw(t: number, attack: number): string[] {
    const p = new Painter(SIZE, SIZE);
    // it squashes as it wobbles, and rears up to spit
    const sq = Math.sin(t * SQUASH_RATE) * SQUASH - attack * 1.5;
    p.ellipse(20, 29 - sq * 0.4, 14 + sq, 9 - sq * 0.5, 'L');
    p.ellipse(20, 23 - sq, 9.5 - sq * 0.3, 8.5, 'L');
    p.rect(8, 32, 24, 5, 'L');
    p.rect(9, 36, 22, 1, 'l');

    // the precipitate: grains falling through it, settling into a layer
    for (let k = 0; k < SPECKS; k++) {
      const x = 11 + hash(k) * 18;
      const y = 18 + fract(hash(k + 40) + t * (0.15 + hash(k + 7) * 0.15)) * 16;
      p.set(x, y, k % 3 ? 'P' : 'p', false);
    }
    p.rect(10, 34, 20, 2, 'P');
    [12, 15, 19, 24, 27].forEach((x) => p.set(x, 35, 'p', false));

    // shine, eyes and mouth
    const lift = Math.round(sq);
    p.rect(14, 18 - lift, 3, 1, 'H');
    p.rect(13, 19 - lift, 1, 2, 'H');
    const ey = 24 - Math.round(sq * 0.5);
    p.rect(16, ey, 2, 3, 'k');
    p.rect(22, ey, 2, 3, 'k');
    p.set(16, ey, 'W');
    p.set(22, ey, 'W');
    if (attack) {
      p.ellipse(20, ey + 5, 2.5, 1.5, 'k');
      p.ellipse(20, ey + 6 + attack * SPIT, 1.6, 1.6, 'G');
    } else p.rect(19, ey + 5, 3, 1, 'm');
    return p.rows();
  },
};
