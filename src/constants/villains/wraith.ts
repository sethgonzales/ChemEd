import { Painter } from '~/utils/pixel-painter';

// The Voltaic Wraith, boss of Electrochemistry: a ghost crackling between a
// zinc anode (−) and a copper cathode (+). Zinc has the lower E°, so it's
// oxidised, and electrons run along the wire overhead from the zinc to the
// copper, as in a real zinc–copper cell.

const SIZE = 40; // art pixels square
const ELECTRONS = 4;
const ELECTRON_SPEED = 0.35; // trips along the wire a second
const HOVER = 1.5; // art pixels it bobs
// the wire: up from the zinc, across the top, down to the copper
const WIRE_UP = 8; // art pixels
const WIRE_ACROSS = 37;
const WIRE = WIRE_UP * 2 + WIRE_ACROSS;

const fract = (n: number) => n - Math.floor(n);
// a steady pseudo-random number, so the sparks don't jitter
const hash = (n: number) => fract(Math.sin(n * 12.9898 + 78.233) * 43758.5453);

/** A point on the wire: 0 at the top of the zinc, 1 at the top of the copper */
export function wirePoint(progress: number) {
  const d = progress * WIRE;
  if (d < WIRE_UP) return { x: 1, y: 11 - d };
  if (d < WIRE_UP + WIRE_ACROSS) return { x: 1 + (d - WIRE_UP), y: 3 };
  return { x: 38, y: 3 + (d - WIRE_UP - WIRE_ACROSS) };
}

export const WRAITH = {
  name: 'The Voltaic Wraith',
  size: SIZE,
  dust: { key: 'D', dir: -1 }, // fizzles out in sparks
  palette: {
    K: '#0b0a10', // outline
    w: '#57534e', // wire
    e: '#fde047', // electrons
    Z: '#9ca3af', // zinc
    z: '#6b7280', // zinc, shaded
    C: '#c2410c', // copper
    c: '#9a3412', // copper, shaded
    o: '#fb923c', // copper, lit
    m: '#1f2937', // the − and + marks
    g: '#e0e7ff', // ghost
    G: '#a5b4fc', // ghost, shaded
    k: '#1e1b4b', // eyes and mouth
    y: '#fde047', // eyes' glow
    W: '#ffffff', // eyes, attacking
    B: '#fde047', // lightning
    D: '#fde047', // sparks
  },
  /** t: seconds, for the current, hover and crackle; attack: 0 to 1 */
  draw(t: number, attack: number): string[] {
    const p = new Painter(SIZE, SIZE);
    // the external circuit, with its electrons
    p.line(1, 11, 1, 3, 'w', false);
    p.line(1, 3, 38, 3, 'w', false);
    p.line(38, 3, 38, 11, 'w', false);
    for (let k = 0; k < ELECTRONS; k++) {
      const { x, y } = wirePoint(fract(t * ELECTRON_SPEED + k / ELECTRONS));
      p.set(x, y, 'e', false);
    }
    // electrodes: zinc on the left (−), copper on the right (+)
    p.rect(0, 12, 4, 25, 'Z');
    p.rect(0, 12, 1, 25, 'z');
    p.rect(36, 12, 4, 25, 'C');
    p.rect(39, 12, 1, 25, 'c');
    p.rect(36, 12, 1, 25, 'o');
    p.rect(1, 15, 2, 1, 'm');
    p.rect(37, 15, 2, 1, 'm');
    p.rect(37.5, 14, 1, 3, 'm');

    // the ghost, bobbing, its tail rippling
    const fy = Math.round(Math.sin(t * 2) * HOVER);
    p.ellipse(20, 13 + fy, 7, 7, 'g');
    p.rect(13, 13 + fy, 14, 16, 'g');
    for (let x = 13; x < 27; x++)
      p.rect(x, 29 + fy, 1, 2 + ((x + Math.floor(t * 6)) % 3), 'g');
    p.rect(25, 14 + fy, 2, 15, 'G');
    p.ellipse(10.5, 20 + fy, 3.5, 1.5, 'g');
    p.ellipse(29.5, 20 + fy, 3.5, 1.5, 'g');
    p.rect(16, 11 + fy, 2, 3, 'k');
    p.rect(22, 11 + fy, 2, 3, 'k');
    p.set(16, 12 + fy, attack ? 'W' : 'y');
    p.set(23, 12 + fy, attack ? 'W' : 'y');
    p.ellipse(20, 18 + fy, attack ? 2.5 : 1.8, attack ? 2 : 1.5, 'k');

    // sparks jumping between its hands and the electrodes, and lightning
    // striking the floor when it attacks
    const frame = Math.floor(t * 10);
    const zigzag = (
      x0: number,
      y0: number,
      x1: number,
      y1: number,
      seed: number,
      steps: number,
    ) => {
      let [px, py] = [x0, y0];
      for (let s = 1; s <= steps; s++) {
        const x = x0 + ((x1 - x0) * s) / steps;
        const y =
          y0 +
          ((y1 - y0) * s) / steps +
          (s < steps ? (hash(seed + s) - 0.5) * 4 : 0);
        p.line(px, py, x, y, 'B', false);
        [px, py] = [x, y];
      }
    };
    if (hash(frame) > 0.25)
      zigzag(4, 18 + Math.floor(hash(frame + 3) * 8), 7, 20 + fy, frame, 3);
    if (hash(frame + 50) > 0.25)
      zigzag(
        33,
        20 + fy,
        35,
        18 + Math.floor(hash(frame + 7) * 8),
        frame + 50,
        3,
      );
    if (attack > 0.2) {
      zigzag(8, 20 + fy, 14, 39, frame + 90, 5);
      zigzag(32, 20 + fy, 26, 39, frame + 120, 5);
    }
    return p.rows();
  },
};
