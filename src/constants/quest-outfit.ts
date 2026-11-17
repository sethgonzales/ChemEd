// Dungeon Quest outfit: a deep hood, goggles down, a cloak closed at the neck
// and a lantern held in front. It's a layer over any character sprite on Mr.
// G's grid (20 × 30, face in columns 4–15 of rows 6–15, eyes on row 8, feet
// on rows 28–29), so student avatars can wear it too.

export const QUEST_PALETTE = {
  V: '#3b3552', // cloak
  v: '#24202f', // shadow inside the hood
  U: '#4a4366', // the cloak's folds
  Q: '#fbbf24', // clasp
  A: '#78716c', // lantern frame
  Y: '#fde047', // flame
  y: '#f97316',
  W: '#fffbeb',
  G: '#334155', // goggle frames and strap, as in the wet labs
  g: '#475569',
} as const;

// Swapped in turn to make the flame flicker
export const FLAME_PALETTES = [
  { Y: '#fde047', y: '#f97316', W: '#fffbeb' },
  { Y: '#fffbeb', y: '#f97316', W: '#fde047' },
  { Y: '#fde047', y: '#ea580c', W: '#fef3c7' },
];

const HOOD = [
  '......KKKKKKKK......',
  '....KKVVVVVVVVKK....',
  '...KVVVVVVVVVVVVK...',
  '..KVVVVVVVVVVVVVVK..',
  '.KVVVVVVVVVVVVVVVVK.',
  '.KVVVVVVVVVVVVVVVVK.', // the rim comes low, over the hair
];

const CLOAK = [
  '.KVVvvvvKSSKvvvvVVK.', // the hood drapes onto the shoulders
  '.KVVVVVVVQQVVVVVVVK.', // clasp at the neck
  'KVVUVVVVcRrcVVVVUVVK', // a sliver of coat and shirt where it parts
  'KVVUVVVcrRrRcVVVUVVK',
  ...Array<string>(8).fill('KVVUVVVVVVVVVVVVUVVK'),
];

const LANTERN_X = 9; // a little right of centre, still in front of the body
const LANTERN_Y = 19;
const LANTERN = [
  '..KKKK..',
  'KSSAASSK', // both hands on its top
  '.KAAAAK.',
  '.KyYWyK.',
  '.KYWWYK.',
  '.KyWWyK.',
  '.KYyyYK.',
  '.KAAAAK.',
  '..KKKK..',
];

const FACE_ROWS = [6, 15]; // first and last
const FACE_X = 4;
const FACE_WIDTH = 12;

// Goggles over the face's eye rows: frames on rows 7 and 9, and on row 8 the
// lenses show the eyes beneath, with the strap at the sides.
const GOGGLE_FRAME = '.GGGG..GGGG.';
const GOGGLE_EYES = 'gG..GggG..Gg';

const overlay = (under: string, over: string) =>
  [...under].map((p, i) => (over[i] && over[i] !== '.' ? over[i] : p)).join('');

function face(row: string, y: number): string {
  let f = row.slice(FACE_X, FACE_X + FACE_WIDTH).replace(/[.Hh]/g, 'v');
  if (y === 7 || y === 9) f = overlay(f, GOGGLE_FRAME);
  if (y === 8) f = overlay(f, GOGGLE_EYES);
  return '.KVv' + f + 'vVK.';
}

/** Dress a character's frame for the dungeon */
export function questOutfit(rows: string[]): string[] {
  const [top, bottom] = FACE_ROWS;
  const out = [
    ...HOOD,
    ...rows.slice(top, bottom + 1).map((row, i) => face(row, top + i)),
    ...CLOAK,
    // the wearer's own feet, under the cloak's hem
    rows[28].slice(0, 1) +
      rows[28].slice(1, 19).replace(/\./g, 'K') +
      rows[28].slice(19),
    rows[29],
  ];
  LANTERN.forEach((over, j) => {
    const y = LANTERN_Y + j;
    const row = out[y];
    out[y] =
      row.slice(0, LANTERN_X) +
      overlay(row.slice(LANTERN_X, LANTERN_X + over.length), over) +
      row.slice(LANTERN_X + over.length);
  });
  return out;
}
