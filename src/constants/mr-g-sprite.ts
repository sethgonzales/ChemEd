/**
 * Mr. G, the in-app guide, as 8-bit pixel art: an 8-bit Seth with a square
 * face, light facial hair, goggles pushed up on his head and a light blue
 * lab coat. Each frame is rows of palette letters; '.' is transparent.
 */

export const SPRITE_WIDTH = 20;
export const SPRITE_HEIGHT = 30;

export const PALETTE = {
  K: '#1f2937', // outline
  H: '#4a3424', // hair, dark brown
  S: '#ecc6a4', // skin
  s: '#d6a986', // skin shadow
  b: '#a8805f', // stubble and mustache, light
  E: '#5b7a99', // eyes, blue-gray
  M: '#7f3b2a', // mouth
  G: '#334155', // goggle frames
  g: '#475569', // goggle strap
  L: '#cbe8f7', // goggle lenses
  C: '#a9d6f5', // lab coat, light blue
  c: '#7fbbe3', // lab coat shadow and lapels
  R: '#b83227', // flannel, red
  r: '#5e1a17', // flannel, dark check
  P: '#374151', // trousers
  F: '#111827', // shoes
} as const;

const idle = [
  '.....KKKKKKKKKK.....', // rounded top of the head
  '....KHHHHHHHHHHK....',
  '...KHHHHHHHHHHHHK...',
  '...KgGGGGHHGGGGgK...', // goggles pushed up on his hair
  '...KgGLLGggGLLGgK...',
  '...KHGGGGHHGGGGHK...',
  '...KHSSSSSSSSSSHK...',
  '...KSHHHSSSSHHHSK...', // eyebrows
  '...KSSEESSSSEESSK...', // blue eyes
  '..KSSSSSSSSSSSSSSK..', // ears
  '..KSbSSSSssSSSSbSK..', // nose; stubble starts at the sides
  '...KbSSSbbbbSSSbK...', // mustache
  '...KbbSSSMMSSSbbK...', // mouth
  '...KbbbSSSSSSbbbK...', // stubble along the jaw
  '....KbbbbbbbbbbK....',
  '....KKKKKKKKKKKK....',
  '........KSSK........',
  '...KCCCcRrRrcCCCK...', // lab coat, open over a flannel shirt
  '..KCCCCcrRrRcCCCCK..',
  '..KCcCCcRrRrcCCcCK..',
  '..KCcCCcrRrRcCCcCK..',
  '..KCcCCcRrRrcCCcCK..',
  '..KScCCcrRrRcCCcSK..', // hands
  '..KKCCCcRrRrcCCCKK..',
  '...KCCCcrRrRcCCCK...',
  '...KcCCCK..KCCCcK...',
  '.....KPPK..KPPK.....', // legs
  '.....KPPK..KPPK.....',
  '....KFFFK..KFFFK....',
  '....KKKKK..KKKKK....',
];

// a copy of idle with some rows replaced
const withRows = (rows: Record<number, string>) =>
  idle.map((row, i) => rows[i] ?? row);

export const FRAMES = {
  idle,
  blink: withRows({ 8: '...KSSKKSSSSKKSSK...' }),
  talk: withRows({
    12: '...KbbSSMMMMSSbbK...',
    13: '...KbbbSMMMMSbbbK...',
  }),
  walk1: withRows({
    27: '....KPPK....KPPK....',
    28: '...KFFFK....KFFFK...',
    29: '...KKKKK....KKKKK...',
  }),
  walk2: withRows({
    27: '......KPPKKPPK......',
    28: '......KFFKKFFK......',
    29: '......KKKKKKKK......',
  }),
};

export type Frame = keyof typeof FRAMES;
