import { Painter } from '~/utils/pixel-painter';

// The Unbalanced Golem, boss of Reaction Balancing: a heap of round atom
// boulders whose arms are a balance beam that never levels, because its pans
// never hold the same atoms. Its colours are art, not a colour convention.

const SIZE = 40; // art pixels square
const PANS = { left: 1, right: 3 }; // atoms in each pan

export const GOLEM = {
  name: 'The Unbalanced Golem',
  size: SIZE,
  pans: PANS,
  dust: { key: 'D', dir: 1 }, // scatters into loose atoms that fall
  palette: {
    K: '#0b0a10', // outline
    C: '#4b5563', // gray boulders
    O: '#dc2626', // red boulders, and the atoms in the pans
    H: '#e5e7eb', // pale boulders
    N: '#2563eb', // blue boulder
    s: '#f3f4f6', // shine on each boulder
    Y: '#fde047', // eyes
    e: '#ef4444', // eyes, attacking
    P: '#b45309', // brass pans
    c: '#78716c', // chains
    D: '#9ca3af', // dust
  },
  /** t: seconds, for the sway; attack: 0 to 1 as it lunges */
  draw(t: number, attack: number): string[] {
    const p = new Painter(SIZE, SIZE);
    const atom = (x: number, y: number, r: number, key: string) => {
      p.ellipse(x, y, r, r, key);
      if (r >= 2) p.set(x - r * 0.45, y - r * 0.45, 's');
    };
    atom(14, 35, 3.5, 'C'); // legs
    atom(26, 35, 3.5, 'C');
    atom(20, 25, 7.5, 'O'); // body
    atom(13, 29, 2.5, 'H');
    atom(28, 28, 2.5, 'H');
    atom(15, 20, 4, 'C'); // shoulders
    atom(25, 20, 4, 'N');
    atom(20, 13, 3.8, 'C'); // head
    const eye = attack > 0 ? 'e' : 'Y';
    p.set(18, 12, eye);
    p.set(21, 12, eye);

    // The beam tips towards the heavier right pan, sways, and never levels.
    // Attacking, it swings harder.
    const tilt =
      0.2 +
      0.1 * Math.sin(t * 1.5) +
      attack * 0.25 * Math.sin(attack * Math.PI * 3);
    const cos = Math.cos(tilt);
    const sin = Math.sin(tilt);
    for (const side of [-1, 1]) {
      for (let k = 1; k <= 3; k++) {
        const d = 5 + k * 3.6;
        atom(
          20 + side * d * cos,
          19 + side * d * sin,
          1.8,
          k === 3 ? 'O' : 'C',
        );
      }
      const ex = 20 + side * 16.5 * cos;
      const ey = 19 + side * 16.5 * sin;
      p.line(ex, ey + 1, ex - 2.5, ey + 6, 'c', false);
      p.line(ex, ey + 1, ex + 2.5, ey + 6, 'c', false);
      p.ellipse(ex, ey + 7, 3.6, 1.5, 'P');
      const load = side < 0 ? PANS.left : PANS.right;
      const spots = [
        [0, 0],
        [-1.6, 0],
        [1.6, 0],
        [0, -1.6],
      ];
      const placed = load === 1 ? [spots[0]] : spots.slice(1, 1 + load);
      placed.forEach(([dx, dy]) =>
        p.rect(ex + dx - 0.5, ey + 5 + dy, 2, 2, 'O'),
      );
    }
    return p.rows();
  },
};
