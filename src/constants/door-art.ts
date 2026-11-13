// Pixel art for each simulation's chamber door on the home page. Rows of
// palette letters, like Mr. G; '.' is transparent. Art fits within
// ART_WIDTH × ART_HEIGHT and scales to fill its archway, so art with no empty
// border draws bigger.

export const ART_WIDTH = 24;
export const ART_HEIGHT = 18;

export type DoorArt = { rows: string[]; palette: Record<string, string> };

export const DOOR_ART = {
  // the periodic table itself, one pixel per element, with iron glowing
  periodic: {
    rows: [
      'S................s',
      'sS......Y...pPpPpP',
      'Ss.....Y....PpPpPp',
      'sSdDdDdGdDdDpPpPpP',
      'SsDdDdDdDdDdPpPpPp',
      'sSdDdDdDdDdDpPpPpP',
      'SsDdDdDdDdDdPpPpPp',
      '..................',
      '..FfFfFfFfFfFfFf..',
      '..fFfFfFfFfFfFfF..',
    ],
    palette: {
      S: '#ef4444', // s-block, checkered so the tiles read apart
      s: '#dc2626',
      P: '#d97706', // p-block
      p: '#b45309',
      D: '#3b82f6', // d-block
      d: '#2563eb',
      F: '#16a34a', // f-block
      f: '#15803d',
      G: '#facc15', // the glowing tile
      Y: '#fef9c3', // its sparkles
    },
  },
  // ice, liquid and gas in jars on a shelf
  states: {
    rows: [
      '........................',
      '....................V...',
      '...................V.V..',
      '..................V...V.',
      '...................VV...',
      '..................V..V..',
      '.................V..V...',
      '..CCCC....CCCC....V..V..',
      '..GLLG....GLLG....GLLG..',
      '.GLLLLG..GLLLLG..GLLLLG.',
      '.GLLLLG..GLLWLG..GLVLLG.',
      '.GLIILG..GQWQQG..GVLVLG.',
      '.GIIIIG..GQQQWG..GLLVLG.',
      '.GIiIIG..GQWQQG..GVLLVG.',
      '.GIIIiG..GQQQQG..GLVLLG.',
      '..GGGG....GGGG....GGGG..',
      'SSSSSSSSSSSSSSSSSSSSSSSS',
      'ssssssssssssssssssssssss',
    ],
    palette: {
      C: '#a16207', // cork
      G: '#cbd5e1', // glass
      L: '#475569', // empty glass
      I: '#e0f2fe', // ice
      i: '#7dd3fc',
      Q: '#22c55e', // liquid
      W: '#dcfce7', // bubbles
      V: '#86efac', // gas
      S: '#92400e', // shelf
      s: '#78350f',
    },
  },
  // water as a constellation: atoms as gems, bonds as threads, and its lone pairs
  lewis: {
    rows: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........e.e..e.e........', // oxygen's two lone pairs
      '........................',
      '...........BB...........',
      '..........BWBB..........',
      '..........BBBB..........',
      '.........Y.bb.Y.........',
      '........Y......Y........',
      '......YY........YY......',
      '...B.Y............Y.B...',
      '..BWB..............BWB..',
      '...b................b...',
      '........................',
      '........................',
      '........................',
    ],
    palette: {
      B: '#3b82f6', // atom gems
      b: '#1d4ed8',
      W: '#ffffff', // highlights
      e: '#ffffff', // lone-pair electrons
      Y: '#93c5fd', // bonds
    },
  },
  // two potions pour into a cauldron and a new compound puffs out
  reactions: {
    rows: [
      '........................',
      '.KK.......FF.........KK.',
      'KRRK.....FFFF.......KUUK',
      'KRRRK.....FF.......KUUUK',
      '.KRRRK......F......KUUUK',
      '..KKKR............UKKK..',
      '......R..........U......',
      '......R..........U......',
      '.......R........U.......',
      '.......R........U.......',
      '...KKKKKKKKKKKKKKKKKK...',
      '...KAAAAaAAAAAAaAAAAK...',
      '....KPPPPPPPPPPPPPPK....',
      '....KPPPPPPPPPPPPPPK....',
      '.....KPPPPPPPPPPPPK.....',
      '.....KPPPPPPPPPPPPK.....',
      '......KKKKKKKKKKKK......',
      '......K..........K......',
    ],
    palette: {
      K: '#111827', // outlines
      R: '#ef4444', // red potion
      U: '#38bdf8', // blue potion
      F: '#fde68a', // the new compound
      A: '#f59e0b', // brew
      a: '#fcd34d',
      P: '#374151', // cauldron
    },
  },
  // a carbon atom: the nucleus with 2 electrons on its inner ring and 4 on the outer
  electrons: {
    rows: [
      '...........RR...........',
      '........RRRRRRRRE.......',
      '......RR.......EEE......',
      '.....ER.........ERR.....',
      '....EEE...RRRR....R.....',
      '....RE...RR..RR....R....',
      '....R..ER......R...R....',
      '....R.EEE..NN..RR..R....',
      '...RR..E..NNNN..R..RR...',
      '...RR..R..NNNN..E..RR...',
      '....R..RR..NN..EEE.R....',
      '....R...R......RE..R....',
      '....R....RR..RR...ER....',
      '.....R....RRRR...EEE....',
      '.....RRE.........RE.....',
      '......EEE.......RR......',
      '.......ERRRRRRRR........',
      '...........RR...........',
    ],
    palette: {
      R: '#a855f7', // shells
      N: '#f472b6', // nucleus
      E: '#fdf4ff', // electrons, as beads on the rings
    },
  },
  // a burette in a stand’s clamp drips into an Erlenmeyer flask on a stirrer;
  // pink swirls where the drops land, as at the endpoint
  titrations: {
    rows: [
      '...R......BEEB..........',
      '...R......BLmB..........',
      '...RAAAAAABLLB..........',
      '...R......BLmB..........',
      '...R......BLLB..........',
      '...R.......BB...........',
      '...R.....CCBBCC.........',
      '...R.......BB...........',
      '...R.......D............',
      '...R.....FFEEFF.........',
      '...R......FEEF..........',
      '...R.....FEEEEF.........',
      '...R.....FLLLLF.........',
      '...R....FLLPPLLF........',
      '...R....FLPPPLLF........',
      '...R...FLLLWWLLLF.......',
      '...R...FFFFFFFFFF.......',
      '.RRRRR.TTTTTTTTgT.......',
    ],
    palette: {
      R: '#64748b', // stand and clamp
      A: '#94a3b8',
      B: '#e2e8f0', // burette glass
      C: '#f8fafc', // stopcock
      E: '#334155', // empty glass
      L: '#7dd3fc', // titrant and the pale solution
      m: '#f8fafc', // scale marks
      D: '#7dd3fc', // a drop
      F: '#e2e8f0', // flask glass
      P: '#ec4899', // pink: nearly at the endpoint
      W: '#ffffff', // stir bar
      T: '#475569', // stirrer
      g: '#4ade80', // its light
    },
  },
} satisfies Record<string, DoorArt>;

export type DoorArtName = keyof typeof DOOR_ART;
