// Each chamber's scenery, in the mood of its boss: the wall's stone, what
// grows on it, the torches' flame and light, and one decoration. The gate and
// map keep the plain, mossy dungeon. Decorative colours only, no data.

export type Decor =
  | 'glyphs' // the Sphinx's painted band
  | 'chains' // the Lich's crypt
  | 'cobwebs' // the Weaver's lair
  | 'icicles' // the Wyrm's ice cave
  | 'cracks' // the Golem's broken wall
  | 'drips' // the Slime's sewer
  | 'reeds' // the Hydra's swamp
  | 'wires' // the Wraith's crackling cables
  | 'gauges' // the Djinn's gas line and pressure gauges
  | 'shelves'; // the Alchemist's laboratory

export interface Backdrop {
  stones: string[]; // shades, picked per stone
  mortar: string;
  edge: string; // each stone's lit top edge
  growth: string[]; // creeping up from the damp floor: moss, frost, slime…
  flame: { core: string; outer: string; glow: string }; // glow as "r g b"
  light: string; // the lamplight in the middle, as "r g b"
  decor?: Decor;
}

const FIRE = { core: '#fde68a', outer: '#f97316', glow: '251 146 60' };
const LAMP = '255 196 110';

export const BACKDROPS: Record<string, Backdrop> = {
  dungeon: {
    stones: ['#2b2623', '#332d29', '#26221f', '#3a332e'],
    mortar: '#0f0d0c',
    edge: '#4a423c',
    growth: ['#365314', '#3f6212'],
    flame: FIRE,
    light: LAMP,
  },
  periodic: {
    stones: ['#7a5c34', '#87663a', '#6f5230', '#937042'],
    mortar: '#2e2010',
    edge: '#b8925e',
    growth: ['#c9a86b', '#b8975c'], // drifted sand
    flame: FIRE,
    light: '255 214 150',
    decor: 'glyphs',
  },
  electrons: {
    stones: ['#2a2433', '#312a3b', '#251f2d', '#382f44'],
    mortar: '#0d0a12',
    edge: '#4a405a',
    growth: ['#3f5f4a', '#4b6b55'], // grave lichen
    flame: { core: '#d9f99d', outer: '#4ade80', glow: '74 222 128' },
    light: '150 255 180',
    decor: 'chains',
  },
  lewis: {
    stones: ['#2a221c', '#30271f', '#241d17', '#372c23'],
    mortar: '#0c0907',
    edge: '#4a3c30',
    growth: ['#6b7280', '#9ca3af'], // dusty silk
    flame: FIRE,
    light: '255 180 100',
    decor: 'cobwebs',
  },
  states: {
    stones: ['#2b3a4a', '#324456', '#273444', '#3a4e63'],
    mortar: '#0b1118',
    edge: '#7dd3fc',
    growth: ['#bae6fd', '#e0f2fe'], // frost
    flame: { core: '#e0f2fe', outer: '#38bdf8', glow: '56 189 248' },
    light: '170 220 255',
    decor: 'icicles',
  },
  balancing: {
    stones: ['#3a3836', '#44413e', '#35332f', '#4d4945'],
    mortar: '#141312',
    edge: '#6b6661',
    growth: ['#365314', '#3f6212'],
    flame: FIRE,
    light: LAMP,
    decor: 'cracks',
  },
  reactions: {
    stones: ['#26301f', '#2c3824', '#222b1b', '#33402a'],
    mortar: '#0a0d07',
    edge: '#4d5e3a',
    growth: ['#84cc16', '#a3e635'], // slime
    flame: { core: '#ecfccb', outer: '#84cc16', glow: '132 204 22' },
    light: '200 255 120',
    decor: 'drips',
  },
  gases: {
    stones: ['#221e33', '#28233c', '#1d1a2c', '#2f2945'],
    mortar: '#09080e',
    edge: '#4c4470',
    growth: ['#a78bfa', '#c4b5fd'], // condensed vapour
    flame: { core: '#f5f3ff', outer: '#a78bfa', glow: '167 139 250' },
    light: '200 185 255',
    decor: 'gauges',
  },
  titrations: {
    stones: ['#1f2d2a', '#243531', '#1b2825', '#2b3e39'],
    mortar: '#08100e',
    edge: '#3e5a52',
    growth: ['#166534', '#15803d'], // algae
    flame: FIRE,
    light: '220 230 160',
    decor: 'reeds',
  },
  electrochemistry: {
    stones: ['#1e2230', '#232838', '#1a1e2a', '#2a3042'],
    mortar: '#07080c',
    edge: '#475569',
    growth: ['#2dd4bf', '#5eead4'], // verdigris, from the copper
    flame: { core: '#ffffff', outer: '#22d3ee', glow: '34 211 238' },
    light: '140 220 255',
    decor: 'wires',
  },
  alchemist: {
    stones: ['#2b1d2e', '#33223a', '#261a29', '#3b2843'],
    mortar: '#0c070d',
    edge: '#5b3f63',
    growth: ['#7e22ce', '#a855f7'], // crystals
    flame: { core: '#f5d0fe', outer: '#c084fc', glow: '192 132 252' },
    light: '220 170 255',
    decor: 'shelves',
  },
};

/** A chamber's backdrop, or the plain dungeon for the gate and map */
export const backdropFor = (id?: string) =>
  (id && BACKDROPS[id]) || BACKDROPS.dungeon;
