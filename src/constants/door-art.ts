// Pixel art for each simulation's chamber door on the home page. Rows of
// palette letters, like Mr. G; '.' is transparent.

export const ART_WIDTH = 24;
export const ART_HEIGHT = 18;

export type DoorArt = { rows: string[]; palette: Record<string, string> };

export const DOOR_ART = {
  // a wall of element tiles like runes, one glowing
  periodic: {
    rows: [
      '........................',
      '........................',
      'TTTTT.TTTTT.TTTTT.TTTTT.',
      'TLLLT.TLLLT.TLLLT.TLLLT.',
      'TTLTT.TTLTT.TTLTT.TTLTT.',
      'ttttt.ttttt.ttttt.ttttt.',
      '...........Y.....Y......',
      'TTTTT.TTTTT.GGGGG.TTTTT.',
      'TLLLT.TLLLT.GYYYG.TLLLT.',
      'TTLTT.TTLTT.GGYGG.TTLTT.',
      'ttttt.ttttt.ggggg.ttttt.',
      '.................Y......',
      'TTTTT.TTTTT.TTTTT.TTTTT.',
      'TLLLT.TLLLT.TLLLT.TLLLT.',
      'TTLTT.TTLTT.TTLTT.TTLTT.',
      'ttttt.ttttt.ttttt.ttttt.',
      '........................',
      '........................',
    ],
    palette: {
      T: '#14b8a6', // tile
      L: '#99f6e4', // rune
      t: '#0f766e', // tile shadow
      G: '#facc15', // the glowing tile
      Y: '#fef9c3', // its rune and sparkles
      g: '#a16207',
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
  // an atom as a dungeon map: the nucleus and its shells of rooms
  electrons: {
    rows: [
      '........................',
      '..RRRRRRRRRERRRRRRRRRR..',
      '..R..................R..',
      '..R..................R..',
      '..E..................R..',
      '..R....RRRRRRRRRR....R..',
      '..R....R........R....E..',
      '..R....E........R....R..',
      '..R....R...NN...R....R..',
      '..R....R...NN...R....R..',
      '..R....R........E....R..',
      '..E....R........R....R..',
      '..R....RRRRRRRRRR....R..',
      '..R..................E..',
      '..R..................R..',
      '..R..................R..',
      '..RRRRRRRRRRERRRRRRRRR..',
      '........................',
    ],
    palette: {
      R: '#a855f7', // shells
      N: '#f472b6', // nucleus
      E: '#f5d0fe', // electrons
    },
  },
  // a burette drips into a flask that is turning pink
  titrations: {
    rows: [
      '..........KGGK..........',
      '..........KGLK..........',
      '..........KGLK..........',
      '..........KGLK..........',
      '..........KGLK..........',
      '...........KK...........',
      '...........KK...........',
      '........................',
      '...........D............',
      '........................',
      '...........D............',
      '..........KGGK..........',
      '.........KGLLGK.........',
      '........KGPPPPGK........',
      '.......KGPPPpPPGK.......',
      '......KGPPpPPPPPGK......',
      '......KKKKKKKKKKKK......',
      '........................',
    ],
    palette: {
      K: '#111827',
      G: '#cbd5e1', // glass
      L: '#94a3b8',
      D: '#f9a8d4', // drops
      P: '#ec4899', // pink: the end point
      p: '#f9a8d4',
    },
  },
} satisfies Record<string, DoorArt>;

export type DoorArtName = keyof typeof DOOR_ART;
