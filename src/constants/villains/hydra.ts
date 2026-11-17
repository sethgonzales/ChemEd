import { INDICATORS } from '~/constants/titrations';
import { Painter } from '~/utils/pixel-painter';

// The Acid Hydra, boss of Titrations: three heads, each a conical flask of an
// indicator in its real colour (from the lab's cited indicator data), with
// acid fumes rising from their necks.

const SIZE = 40; // art pixels square
const SWAY_RATE = 2; // rad/s
const LUNGE = 5; // art pixels a head drops as it strikes
const FUMES = 3; // wisps per head
const FLASK_ROWS = 8; // art pixels tall
const FLASK_WIDTH = 11; // art pixels, at the base

const fract = (n: number) => n - Math.floor(n);
// a colour without its alpha, as the painter's palette wants
const solid = (c: string) => c.slice(0, 7);
const [methylOrange, bromothymolBlue, phenolphthalein] = INDICATORS;

export const HYDRA = {
  name: 'The Acid Hydra',
  size: SIZE,
  dust: { key: 'D', dir: 1 }, // splashes into an acid puddle
  palette: {
    K: '#0b0a10', // outline
    S: '#4d7c0f', // scales
    s: '#65a30d', // its paler belly
    g: '#e2e8f0', // glass
    G: '#94a3b8', // the glass's edge
    '1': solid(methylOrange.colors[0]), // red, in acid
    '2': solid(bromothymolBlue.colors.at(-1)!), // blue, in base
    '3': solid(phenolphthalein.colors.at(-1)!), // pink, in base
    k: '#111827', // eyes and mouths
    f: '#bef264', // acid fumes
    D: '#a3e635', // the puddle it splashes into
  },
  /** t: seconds, for the sway and fumes; attack: 0 to 1 as the heads strike */
  draw(t: number, attack: number): string[] {
    const p = new Painter(SIZE, SIZE);
    // each neck runs from the body (b) to its head (h)
    const heads = [
      { bx: 12, by: 28, hx: 8, hy: 13 },
      { bx: 20, by: 26, hx: 20, hy: 8 },
      { bx: 28, by: 28, hx: 32, hy: 13 },
    ].map((h, i) => {
      const phase = t * SWAY_RATE + i * 2;
      // the heads strike one after another
      const lunge = attack
        ? Math.max(0, Math.sin(Math.min(1, attack * 1.3 - i * 0.15) * Math.PI))
        : 0;
      return {
        ...h,
        hx: h.hx + Math.sin(phase) * 2,
        hy: h.hy + Math.cos(phase) + lunge * LUNGE,
      };
    });

    // necks: curves bowing outwards, drawn as a chain of scales
    heads.forEach((h, i) => {
      const mx = (h.bx + h.hx) / 2 + (i - 1) * 3;
      const my = (h.by + h.hy) / 2 + 2;
      for (let s = 0; s <= 1; s += 0.08) {
        const x = (1 - s) ** 2 * h.bx + 2 * (1 - s) * s * mx + s * s * h.hx;
        const y =
          (1 - s) ** 2 * h.by + 2 * (1 - s) * s * my + s * s * (h.hy + 4);
        p.ellipse(x, y, 2.2, 2.2, 'S');
      }
    });
    p.ellipse(20, 33, 13, 6.5, 'S');
    p.ellipse(20, 35, 7, 3.5, 's');
    p.rect(9, 38, 4, 2, 'S');
    p.rect(27, 38, 4, 2, 'S');

    // heads: conical flasks, the liquid slopping as they sway
    heads.forEach((h, i) => {
      const hx = Math.round(h.hx);
      const y0 = Math.round(h.hy) - 4;
      const level = 4 + (Math.sin(t * 3 + i) > 0.3 ? 0 : 1);
      for (let r = 0; r < FLASK_ROWS; r++) {
        const w = r < 2 ? 3 : Math.min(FLASK_WIDTH, 3 + (r - 1) * 2);
        const x0 = hx - Math.floor(w / 2);
        for (let x = x0; x < x0 + w; x++) {
          const edge = x === x0 || x === x0 + w - 1;
          p.set(
            x,
            y0 + r,
            r >= level && !edge ? String(i + 1) : edge && r > 1 ? 'G' : 'g',
          );
        }
      }
      p.rect(hx - 2, y0 + 3, 1, 1, 'k');
      p.rect(hx + 2, y0 + 3, 1, 1, 'k');
      if (attack) p.rect(hx - 1, y0 + 7, 3, 1, 'k');
      for (let k = 0; k < FUMES; k++) {
        const f = fract(t * 0.8 + k / FUMES + i * 0.2);
        p.set(hx + Math.sin(f * 6 + i) * 1.2, y0 - 1 - f * 6, 'f', false);
      }
    });
    return p.rows();
  },
};
