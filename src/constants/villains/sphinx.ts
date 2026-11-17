import { BLOCK_COLORS } from '~/constants/blocks';
import { Painter } from '~/utils/pixel-painter';

// The Element Sphinx, boss of the Periodic Table: a stone sphinx whose
// headdress is element tiles in the table's s, p, d and f block colours. One
// tile glows at a time, as if it were thinking of an element.

const SIZE = 40; // art pixels square
const GLOW_RATE = 1.5; // tiles a second the glow moves on
const BLINK_EVERY = 3.2; // s
const BLINK_SHARE = 0.07; // of each BLINK_EVERY spent with its eyes shut
const TILES = ['R', 'O', 'B', 'G']; // s, p, d, f

const fract = (n: number) => n - Math.floor(n);

export const SPHINX = {
  name: 'The Element Sphinx',
  size: SIZE,
  dust: { key: 'D', dir: 1 }, // crumbles to gravel
  palette: {
    K: '#0b0a10', // outline
    S: '#8b8577', // stone
    d: '#6b6559', // stone in shadow
    L: '#aaa395', // its face, lit
    R: BLOCK_COLORS.s,
    O: BLOCK_COLORS.p,
    B: BLOCK_COLORS.d,
    G: BLOCK_COLORS.f,
    c: '#3f3a33', // each tile's shaded corner
    Y: '#facc15', // the glowing tile
    E: '#facc15', // eyes
    e: '#ef4444', // eyes, attacking
    m: '#1a1712', // its mouth, open
    A: '#d97706', // its beard
    a: '#92400e', // the beard's tip
    D: '#8b8577', // gravel
  },
  /** t: seconds, for the glow and blinks; attack: 0 to 1 as it lunges */
  draw(t: number, attack: number): string[] {
    const p = new Painter(SIZE, SIZE);
    // body, lying down, with its paws out front
    p.ellipse(20, 31, 16, 6.5, 'd');
    p.ellipse(20, 26, 8, 7, 'S');
    p.rect(7, 32, 9, 5, 'S');
    p.rect(24, 32, 9, 5, 'S');
    [9, 11, 13, 26, 28, 30].forEach((x) => p.set(x, 36, 'd')); // toes
    p.set(27, 29, 'd');
    p.set(28, 30, 'd');
    p.set(12, 30, 'd');

    // the headdress: 2 × 2 element tiles over the head and down each side
    const inHead = (x: number, y: number) =>
      ((x + 0.5 - 20) / 10) ** 2 + ((y + 0.5 - 11) / 6) ** 2 <= 1 ||
      (y >= 11 && y < 25 && ((x >= 9 && x < 15) || (x >= 25 && x < 31)));
    const tiles: [number, number][] = [];
    for (let ty = 4; ty < 26; ty += 2)
      for (let tx = 8; tx < 32; tx += 2)
        if (inHead(tx, ty) || inHead(tx + 1, ty + 1)) tiles.push([tx, ty]);
    const glow = Math.floor(t * GLOW_RATE) % tiles.length;
    tiles.forEach(([tx, ty], n) => {
      const lit = n === glow;
      const key = lit ? 'Y' : TILES[(tx / 2 + ty / 2) % 4];
      for (let j = 0; j < 2; j++)
        for (let i = 0; i < 2; i++)
          if (inHead(tx + i, ty + j))
            p.set(tx + i, ty + j, i && j && !lit ? 'c' : key);
    });

    // the face
    p.rect(15, 10, 10, 11, 'L');
    p.ellipse(20, 20, 5, 3, 'L');
    const shut = !attack && fract(t / BLINK_EVERY) > 1 - BLINK_SHARE;
    const eye = attack ? 'e' : shut ? 'd' : 'E';
    p.rect(16, 13, 3, attack ? 2 : 1, eye);
    p.rect(21, 13, 3, attack ? 2 : 1, eye);
    p.rect(19, 15, 2, 2, 'S'); // nose
    p.rect(17, 18, 6, attack ? 2 : 1, attack ? 'm' : 'd');
    p.rect(19, 23, 2, 5, 'A'); // beard
    p.rect(19, 27, 2, 1, 'a');
    return p.rows();
  },
};
