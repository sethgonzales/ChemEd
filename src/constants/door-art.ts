// Pixel art for each simulation's chamber door on the home page. Rows of
// palette letters, like Mr. G; '.' is transparent. Each pixel draws as one of
// the app's pixels (PIXEL), so the art shares the grid of the stone, corners
// and Mr. G, and fits within ART_WIDTH × ART_HEIGHT.

export const ART_WIDTH = 48;
export const ART_HEIGHT = 36;

export type DoorArt = { rows: string[]; palette: Record<string, string> };

export const DOOR_ART = {
  // the periodic table itself, a 2 × 2 tile per element, with iron glowing
  periodic: {
    rows: [
      'SS................................PP',
      'Ss.............Y..................Pp',
      'SSSS..........YyY.......PPPPPPPPPPPP',
      'SsSs...........Y........PpPpPpPpPpPp',
      'SSSS........Y...........PPPPPPPPPPPP',
      'SsSs....................PpPpPpPpPpPp',
      'SSSSDDDDDDDDDDGGDDDDDDDDPPPPPPPPPPPP',
      'SsSsDdDdDdDdDdGGDdDdDdDdPpPpPpPpPpPp',
      'SSSSDDDDDDDDDDDDDDDDDDDDPPPPPPPPPPPP',
      'SsSsDdDdDdDdDdDdDdDdDdDdPpPpPpPpPpPp',
      'SSSSDDDDDDDDDDDDDDDDDDDDPPPPPPPPPPPP',
      'SsSsDdDdDdDdDdDdDdDdDdDdPpPpPpPpPpPp',
      'SSSSDDDDDDDDDDDDDDDDDDDDPPPPPPPPPPPP',
      'SsSsDdDdDdDdDdDdDdDdDdDdPpPpPpPpPpPp',
      '....................................',
      '....................................',
      '....FFFFFFFFFFFFFFFFFFFFFFFFFFFF....',
      '....FfFfFfFfFfFfFfFfFfFfFfFfFfFf....',
      '....FFFFFFFFFFFFFFFFFFFFFFFFFFFF....',
      '....FfFfFfFfFfFfFfFfFfFfFfFfFfFf....',
    ],
    palette: {
      S: '#ef4444', // s-block
      s: '#b91c1c', // each tile’s shadowed corner
      P: '#d97706', // p-block
      p: '#92400e',
      D: '#3b82f6', // d-block
      d: '#1d4ed8',
      F: '#16a34a', // f-block
      f: '#166534',
      G: '#facc15', // the glowing tile
      Y: '#fef9c3', // its sparkles
      y: '#ffffff',
    },
  },
  // ice, liquid and gas in jars on a shelf
  states: {
    rows: [
      '................................................',
      '................................................',
      '................................................',
      '.......................................V........',
      '........................................V.......',
      '........................................Vv......',
      '.......................................V.v......',
      '......................................V...v.....',
      '.....................................V.....v....',
      '....................................V.......v...',
      '....................................V......v....',
      '.....................................V.....v....',
      '.....CCCCCC..........CCCCCC...........V...v.....',
      '.....CCCCCC..........CCCCCC............V.v......',
      '.....cccccc..........cccccc.............v.......',
      '....GLLLLLLG........GLLLLLLG........GLLLVvLG....',
      '....GLLLLLLG........GLLLLLLG........GLLVLLLG....',
      '...GLLLLLLLLG......GLLLLLLLLG......GLLVLLLLLG...',
      '..GLLLLLLLLLLG....GLLLLLLLLLLG....GLLLLLLLLLLG..',
      '..GHLLLLLLLLLG....GHLLLLLLLLLG....GHLLLLLVVLLG..',
      '..GHLLLLLLLLLG....GHLLLLLLLLLG....GHVVLLLVVLLG..',
      '..GHLIIIIIILLG....GHLLLLLLLLLG....GHVVLVVLLLLG..',
      '..GHLIIIIiILLG....GHqqqqqqqqqG....GHLLLVVLLLLG..',
      '..GHLIIIIiILLG....GHQQQQQQQQQG....GHLLLLLLLVVG..',
      '..GHLIIIIiILLG....GHQQQWQQQQQG....GHLLVVLLLVVG..',
      '..GLLIIIIiILLG....GQQQQQQQQQQG....GLLLVVLLLLLG..',
      '..GLLiiiiiILLG....GQQQWWQWQQQG....GLLLLLLLLLLG..',
      '..GIIIIiIIIIiG....GQQQWWQQQQQG....GLLLLLLLLVVG..',
      '..GIIIIiIIIIiG....GQQWQQQQQQQG....GLVVLLLLLVVG..',
      '..GIIIIiIIIIiG....GQQQQQQQWQQG....GLVVLLVVLLLG..',
      '..GIIIIiIIIIiG....GRRRRRRRRRRG....GLLLLLVVLLLG..',
      '..GiiiiiiiiiiG....GRRRRRRRRRRG....GLLLLLLLLLLG..',
      '...GGGGGGGGGG......GGGGGGGGGG......GGGGGGGGGG...',
      'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS',
      'SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS',
      'ssssssssssssssssssssssssssssssssssssssssssssssss',
    ],
    palette: {
      C: '#a16207', // cork
      c: '#713f12',
      G: '#cbd5e1', // glass
      H: '#f8fafc', // a glint on the glass
      L: '#475569', // empty glass
      I: '#e0f2fe', // ice
      i: '#7dd3fc',
      Q: '#22c55e', // liquid
      q: '#86efac', // its surface
      R: '#15803d', // deeper down
      W: '#dcfce7', // bubbles
      V: '#86efac', // gas
      v: '#4ade80',
      S: '#92400e', // shelf
      s: '#78350f',
    },
  },
  // water as a constellation: atoms as gems, bonds as threads, and the lone pairs fanned up and out, as in its tetrahedral arrangement
  lewis: {
    rows: [
      '................................................',
      '................................................',
      '..............................z.................',
      '................................................',
      '....z...........................................',
      '................................................',
      '..........................................z.....',
      '................................................',
      '................................................',
      '................................................',
      '.................ee..........ee.................',
      '.................ee..........ee.................',
      '................................................',
      '...............ee.....OOOO.....ee...............',
      '...............ee....OOOOOO....ee...............',
      '....................OWWOOOOO....................',
      '....................OOOOOOOO....................',
      '...................OOOOOOOOoo...................',
      '....................OOOOOOoo....................',
      '....................OOOOOoooY...................',
      '....................YOOOoooYYY..................',
      '...................YYYOooo..YYY.................',
      '.................YYYY........YYYY...............',
      '................YYYY..........YYYY..............',
      '...............YYY..............YYY.............',
      '........HHHHH.YYY................YYHHHHH........',
      '........WWHHHYYY..................YWWHHH........',
      '.......HHHHHHhY...................HHHHHHh.......',
      '.......HHHHHhh....................HHHHHhh.......',
      '........HHHhh......................HHHhh........',
      '.........Hhh........................Hhh.........',
      '............................................z...',
      '................................................',
      '........z.......................................',
      '................................................',
      '................................................',
    ],
    palette: {
      O: '#ef4444', // oxygen, red as in CPK colours
      o: '#b91c1c',
      H: '#e2e8f0', // hydrogen
      h: '#94a3b8',
      W: '#ffffff', // highlights
      e: '#facc15', // lone-pair electrons
      Y: '#93c5fd', // bonds
      z: '#64748b', // faint stars
    },
  },
  // two potions pour into a cauldron and a new compound puffs out
  reactions: {
    rows: [
      '................................................',
      '.....KKKKK................F...........KKKKK.....',
      '....KKRRRKK..........................KKUUUKK....',
      '...KKRWRRRKK...........FF...........KKUWUUUKK...',
      '...KRRRRRRRK...........FF...........KUUUUUUUK...',
      '...KRRRRRRRK........................KUUUUUUUK...',
      '...KRRRRRRRK........................KUUUUUUUK...',
      '...KKrrrrrKK...........FFF..........KKuuuuuKK...',
      '....KKrrrKKK..........FFFFF.........KKKuuuKK....',
      '.....KKKKKKKK........FFFFFFF.......KKKKKKKK.....',
      '...........KKK.....FFFFFFFFFFF....KKK...........',
      '............KKK...FFFFFFFFFFFFF..KKK............',
      '.............KRR..FFFFFFFFFFFFF.UUK.............',
      '..............RR..fffffffffffff.UU..............',
      '..............RR...fff.....fff..UU..............',
      '..............RR................UU..............',
      '..............RR................UU..............',
      '..............RR..............a.UU..............',
      '.....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.....',
      '....KKAAAAaAAAAAAaAAAAAAAAaAAAAAAaAAAAaAAAKK....',
      '.....KKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKKK.....',
      '.....KPPPPPPPPPPPPPPPPPPPPPPPPPpppppppppppK.....',
      '.....KPPPPPPPPPPPPPPPPPPPPPPPPPpppppppppppK.....',
      '.....KPPPPPPPPPPPPPPPPPPPPPPPPPpppppppppppK.....',
      '......KPPPPPPPPPPPPPPPPPPPPPPPPppppppppppK......',
      '......KPPPPPPPPPPPPPPPPPPPPPPPPppppppppppK......',
      '......KPPPPPPPPPPPPPPPPPPPPPPPPppppppppppK......',
      '.......KPPPPPPPPPPPPPPPPPPPPPPPpppppppppK.......',
      '........KPPPPPPPPPPPPPPPPPPPPPPppppppppK........',
      '.........KPPPPPPPPPPPPPPPPPPPPPpppppppK.........',
      '..........KPPPPPPPPPPPPPPPPPPPPppppppK..........',
      '...........KppppppppppppppppppppppppK...........',
      '............KppppppppppppppppppppppK............',
      '.............KKKKKKKKKKKKKKKKKKKKKK.............',
      '............KKK..................KKK............',
      '............KKK..................KKK............',
    ],
    palette: {
      K: '#111827', // outlines
      R: '#ef4444', // red potion
      r: '#b91c1c',
      U: '#38bdf8', // blue potion
      u: '#0284c7',
      W: '#ffffff', // a glint on the glass
      F: '#fde68a', // the new compound
      f: '#fbbf24',
      A: '#f59e0b', // brew
      a: '#fcd34d', // its bubbles
      P: '#374151', // cauldron
      p: '#1f2937',
    },
  },
  // a level balance: 2 H₂ + O₂ in one pan, 2 H₂O in the other, the same atoms
  balancing: {
    rows: [
      '.......................KK.......................',
      '.......................KK.......................',
      '.......................KK.......................',
      '.......................KK.......................',
      '...BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB...',
      '...bbbbbbbbbbbbbbbbbbTTTTTTbbbbbbbbbbbbbbbbbb...',
      '......CC.............TTTTTT.............CC......',
      '.....C..C............TTTTTT............C..C.....',
      '.....C..C............TTTTTT............C..C.....',
      '....C....C...........TTTTTT...........C....C....',
      '...C......C..........TTTTTT..........C......C...',
      '...C......C..........TTTTTT..........C......C...',
      '..C.NNNNMM.C.........TTTTTT.........C.NNMMNN.C..',
      '.C..NNNNMM..C........TTTTTT........C..NNMMNN..C.',
      '.C..NNNNMM..C........TTTTTT........C..NNMMNN..C.',
      'C...NNNNMM...C.......TTTTTT.......C...NNMMNN...C',
      'PPPPPPPPPPPPPP.......TTTTTT.......PPPPPPPPPPPPPP',
      '.PPPPPPPPPPPP........TTTTTT........PPPPPPPPPPPP.',
      '..pppppppppp.........TTTTTT.........pppppppppp..',
      '.....................TTTTTT.....................',
      '.................TTTTTTTTTTTTTT.................',
      '...............TTTTTTTTTTTTTTTTTT...............',
      '.............TTTTTTTTTTTTTTTTTTTTTT.............',
      '.............tttttttttttttttttttttt.............',
    ],
    palette: {
      K: '#fde68a', // the pointer, upright when level
      B: '#fbbf24', // brass beam
      b: '#b45309',
      T: '#d97706', // its stand
      t: '#92400e',
      C: '#9ca3af', // chains
      P: '#fbbf24', // pans
      p: '#b45309',
      N: '#f8fafc', // hydrogen, white as in CPK colours
      M: '#ef4444', // oxygen, red
    },
  },
  // a carbon atom: the nucleus with 2 electrons on its inner ring and 4 on the outer
  electrons: {
    rows: [
      '................................................',
      '...........................EE...................',
      '..................RRRRRRRREWEE..................',
      '................RRRRRRRRRREEEERR................',
      '...............RRRR........EERRRR...............',
      '.............RRRR..............RRRR.............',
      '............RRR..................RRR............',
      '...........RRR....................RRR...........',
      '...........RR......................RR...........',
      '..........RR.........RRRRRR.........RR..........',
      '.........RRR.......RRRRRRRRRR.......RRR.........',
      '.........RR.......RRR......RRR.......RR.........',
      '........WER......RRR........RREE.....RRR........',
      '.......EEEE.....RRR..........WEEE.....RR........',
      '.......EEEE.....RR.....NN....EEEE.....RR........',
      '........EE.....RR....NWNNnN...EER.....RR........',
      '........RR.....RR....NnNNNN....RR.....RR........',
      '........RR.....RR...NnNNnNNN...RR.....RR........',
      '........RR.....RR...NNnNNNNN...RR.....RR........',
      '........RR.....RR....NNnNNN....RR.....RR........',
      '........RR.....REE...NNNNNN....RR.....EE........',
      '........RR.....EWEE....NN.....RR.....WEEE.......',
      '........RR.....EEEE..........RRR.....EEEE.......',
      '........RRR.....EERR........RRR......REE........',
      '.........RR.......RRR......RRR.......RR.........',
      '.........RRR.......RRRRRRRRRR.......RRR.........',
      '..........RR.........RRRRRR.........RR..........',
      '...........RR......................RR...........',
      '...........RRR....................RRR...........',
      '............RRR..................RRR............',
      '.............RRRR..............RRRR.............',
      '...............RRRWEE........RRRR...............',
      '................RREEEERRRRRRRRRR................',
      '..................EEEERRRRRRRR..................',
      '...................EE...........................',
      '................................................',
    ],
    palette: {
      R: '#a855f7', // shells
      N: '#f472b6', // nucleus: protons
      n: '#be185d', // and neutrons
      E: '#fdf4ff', // electrons, as beads on the rings
      W: '#ffffff', // highlights
    },
  },
  // a burette in a stand’s clamp drips into an Erlenmeyer flask on a stirrer;
  // pink swirls where the drops land, as at the endpoint
  titrations: {
    rows: [
      '........RR............BEEEEB....................',
      '........RR............BEEEEB....................',
      '........RR............BEEEEB....................',
      '........RR..........RRBLLLLB....................',
      '........RRAAAAAAAAAARRBmmLLB....................',
      '........RRAAAAAAAAAARRBLLLLB....................',
      '........RR..........RRBmmLLB....................',
      '........RR............BLLLLB....................',
      '........RR............BmmLLB....................',
      '........RR............BLLLLB....................',
      '........RR............BLLLLB....................',
      '........RR.............BBBB.....................',
      '........RR..............BB......................',
      '........RR.........CCCCCCCCCCCC.................',
      '........RR..........cccccccccc..................',
      '........RR..............BB......................',
      '........RR..............BB......................',
      '........RR..............DD......................',
      '........RR..............DD......................',
      '........RR......................................',
      '........RR...........FFEEEEFF...................',
      '........RR............FEEEEF....................',
      '........RR............FEEEEF....................',
      '........RR............FEEEEF....................',
      '........RR...........FEEEEEEF...................',
      '........RR..........FEEEEEEEEF..................',
      '........RR.........FEEEEEEEEEEF.................',
      '........RR........FLLLLLLLLLLLLF................',
      '........RR.......FLLLLLPLLLLLLLLF...............',
      '........RR......FLLLLLLLPPLLLLLLLF..............',
      '........RR......FLLLLLPLLLPLLLLLLF..............',
      '........RR......FLLLLPLLPLLPLLLLLF..............',
      '........RR......FLLLPLLLLLLLPLLLLF..............',
      '........RR......FLLLLLLWWWWLLLLLLF..............',
      '........RR......FFFFFFFFFFFFFFFFFF..............',
      '...RRRRRRRRRRTTTTTTTTTTTTTTTTTTTTTgTT...........',
    ],
    palette: {
      R: '#64748b', // stand and clamp
      A: '#94a3b8',
      B: '#e2e8f0', // burette glass
      C: '#f8fafc', // stopcock
      c: '#94a3b8',
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
  // a Daniell cell lighting a bulb: zinc and copper, joined by a salt bridge
  electrochemistry: {
    rows: [
      '..................g....YY....g..................',
      '......................yYYY......................',
      '...................g.YYYYYY.g...................',
      '.....................YYYYYY.....................',
      '.................g...YYYYYY...g.................',
      '......................YYYY......................',
      '......................bbbb......................',
      '.......WWWWWWWWWWWWWWWbbbbWWWWWWWWWWWWWW........',
      '.......Zz..............................Cc.......',
      '.......Zz..............................Cc.......',
      '.......Zz..............................Cc.......',
      '.......Zz....SSSSSSSSSSSSSSSSSSSSSS....Cc.......',
      '.......Zz....SSSSSSSSSSSSSSSSSSSSSS....Cc.......',
      '.......Zz....SS..................SS....Cc.......',
      '..G....Zz....SS....G........G....SS....Cc....G..',
      '..G....Zz....SS....G........G....SS....Cc....G..',
      '..G....Zz....SS....G........G....SS....Cc....G..',
      '..G....Zz....SS....G........G....SS....Cc....G..',
      '..G....Zz....SS....G........G....SS....Cc....G..',
      '..GllllZzllllSSllllG........GuuuuSSuuuuCcuuuuG..',
      '..GLLLLZzLLLLSSLLLLG........GUUUUSSUUUUCcUUUUG..',
      '..GLLLLZzLLLLSSLLLLG........GUUUUSSUUUUCcUUUUG..',
      '..GLLLLZzLLLLSSLLLLG........GUUUUSSUUUUCcUUUUG..',
      '..GLLLLZzLLLLSSLLLLG........GUUUUSSUUUUCcUUUUG..',
      '..GLLLLZzLLLLSSLLLLG........GUUUUSSUUUUCcUUUUG..',
      '..GLLLLZzLLLLSSLLLLG........GUUUUSSUUUUCcUUUUG..',
      '..GLLLLZzLLLLSSLLLLG........GUUUUSSUUUUCcUUUUG..',
      '..GLLLLZzLLLLLLLLLLG........GUUUUUUUUUUCcUUUUG..',
      '..GLLLLZzLLLLLLLLLLG........GUUUUUUUUUUCcUUUUG..',
      '..GLLLLZzLLLLLLLLLLG........GUUUUUUUUUUCcUUUUG..',
      '..GLLLLZzLLLLLLLLLLG........GUUUUUUUUUUCcUUUUG..',
      '..GLLLLLLLLLLLLLLLLG........GUUUUUUUUUUUUUUUUG..',
      '..GLLLLLLLLLLLLLLLLG........GUUUUUUUUUUUUUUUUG..',
      '..GLLLLLLLLLLLLLLLLG........GUUUUUUUUUUUUUUUUG..',
      '..GGGGGGGGGGGGGGGGGG........GGGGGGGGGGGGGGGGGG..',
      'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    ],
    palette: {
      Y: '#facc15', // the lit bulb
      y: '#fef9c3',
      g: '#fef08a', // its glow
      b: '#94a3b8', // the bulb’s base
      W: '#cbd5e1', // wire
      Z: '#9ca3af', // zinc
      z: '#6b7280',
      C: '#c47a4a', // copper
      c: '#9a5a32',
      S: '#f1f5f9', // salt bridge
      G: '#e2e8f0', // beaker glass
      L: '#bae6fd', // zinc nitrate, nearly colourless
      l: '#e0f2fe',
      U: '#3b82f6', // copper(II) nitrate, blue
      u: '#60a5fa',
      T: '#475569', // bench
    },
  },
  // the Dungeon Quest: stairs down into the dark, torches either side, and
  // a pair of eyes waiting
  dungeon: {
    rows: [
      '................................................',
      '..................SSsSSSSsSSSS..................',
      '................SSSSsSSSSsSSSSsS................',
      '..............ssssssssssssssssssss..............',
      '.............sSSSSsDDDDDDDDDDSSSSsS.............',
      '............SsSSSDDDDDDDDDDDDDDSSsSS............',
      '...........ssssDDDDDDDDDDDDDDDDDDssss...........',
      '..........sSSSDDDDDDDDDDDDDDDDDDDDSsSS..........',
      '..........sSSDDDDDDDDDDDDDDDDDDDDDDsSS..........',
      '.........ssssDDDDDDDDDDDDDDDDDDDDDDssss.........',
      '.........SSSDDDDDDDDDDDDDDDDDDDDDDDDSSs.........',
      '........sSSDDDDDDDDDDDDDDDDDDDDDDDDDDSsS........',
      '...F....sssDDDDDDDDDDDDDDDDDDDDDDDDDDsss....F...',
      '..FfF..SSSsDDDDDDDDDDDDDDDDDDDDDDDDDDSSSs..FfF..',
      '..FfF..SSSDDDDDDDDDDDDDDDDDDDDDDDDDDDDSSs..FfF..',
      '...F...sssDDDDDDDDDDDDDDDDDDDDDDDDDDDDsss...F...',
      '...b...SsSDDDDDDDDDDDDDDDDDDDDDDDDDDDDsSS...b...',
      '...b...SsSDDDDDDDDDDDDDDDDDDDDDDDDDDDDsSS...b...',
      '...b...sssDDDDDDDDDDDDDDDDDDDDDDDDDDDDsss...b...',
      '...b...SSSDDDDDDDDDDDDDDDDDDDDDDDDDDDDSSs...b...',
      '...b...SSSDDDDDDDDDDDDDDDDDDDDDDDDDDDDSSs...b...',
      '.......sssDDDDDDDDDDYYDDDDYYDDDDDDDDDDsss.......',
      '.......SsSDDDDDDDDDDDDDDDDDDDDDDDDDDDDsSS.......',
      '.......SsSDDDDDDDDDDDDDDDDDDDDDDDDDDDDsSS.......',
      '.......sssDDDDDDDDDDDDDDDDDDDDDDDDDDDDsss.......',
      '.......SSSDDDDDDDDDDDDDDDDDDDDDDDDDDDDSSs.......',
      '.......SSSDDDDDDDDDDDDDDDDDDDDDDDDDDDDSSs.......',
      '.......sssDDDDDDDDDDDDDDDDDDDDDDDDDDDDsss.......',
      '.......SsSDDDDDDDDDeeeeeeeeeeDDDDDDDDDsSS.......',
      '.......SsSDDDDDDDDDddddddddddDDDDDDDDDsSS.......',
      '.......sssDDDDDDeeeeeeeeeeeeeeeeDDDDDDsss.......',
      '.......SSSDDDDDDddddddddddddddddDDDDDDSSs.......',
      '.......SSSDDDeeeeeeeeeeeeeeeeeeeeeeDDDSSs.......',
      '.......sssDDDddddddddddddddddddddddDDDsss.......',
      '.......SsSeeeeeeeeeeeeeeeeeeeeeeeeeeeesSS.......',
      '.......SsSddddddddddddddddddddddddddddsSS.......',
    ],
    palette: {
      S: '#57534e', // stone
      s: '#44403c', // mortar
      D: '#0c0a09', // the dark
      d: '#292524', // stairs
      e: '#44403c', // each stair’s edge
      Y: '#fde047', // eyes
      F: '#f97316', // torch flame
      f: '#fde68a', // its core
      b: '#78716c', // torch bracket
    },
  },
  // the gas law game: Mr. G's hot-air balloon among the clouds
  balloon: {
    rows: [
      '................................................',
      '....................rRRRYYYy....................',
      '.................yyRRRRRYYYYYrr.................',
      '................yYYRRRRRYYYYYRRr................',
      '..............rYHHYRRRRRYYYYYRRRRy..............',
      '.............rRHHYYRRRRRYYYYYRRRRYy.............',
      '............rrHHYYYRRRRRYYYYYRRRRYyy............',
      '............rRHHYYYRRRRRYYYYYRRRRYYy.....ccccc..',
      '...........rRHHYYYYRRRRRYYYYYRRRRYYYy..ccccccccc',
      '...........rRHHYYYYRRRRRYYYYYRRRRYYYy...........',
      '..........rrHHRYYYYRRRRRYYYYYRRRRYYYyy..........',
      '..........rRRRRYYYYRRRRRYYYYYRRRRYYYYy..........',
      '..........rRRRRYYYYRRRRRYYYYYRRRRYYYYy..........',
      '..........rRRRRYYYYRRRRRYYYYYRRRRYYYYy..........',
      '...........rRRRYYYYRRRRRYYYYYRRRRYYYy...........',
      '............rRRYYYYRRRRRYYYYYRRRRYYy............',
      '............rrRYYYYRRRRRYYYYYRRRRYyy............',
      '.............rrYYYYRRRRRYYYYYRRRRyy.............',
      '..............rYYYYRRRRRYYYYYRRRRy..............',
      '...............yYYYRRRRRYYYYYRRRr...............',
      '................yYYRRRRRYYYYYRRr................',
      '..ccccc..........yYRRRRRYYYYYRr.................',
      'ccccccccc........yyRRRRRYYYYYrr.................',
      '..................yrRRRRYYYYyr..................',
      '...................rRRRRYYYYy...................',
      '....................rRRRYYYy....................',
      '....................l.FffF.l....................',
      '....................l......l....................',
      '....................l......l....................',
      '....................l......l.............ccc....',
      '...................bbbbbbbbbb..........ccccccc..',
      '...................BbBBbBBbBB...................',
      '...................bBBbBBbBBb...................',
      '...................BBbBBbBBbB...................',
      '...................BbBBbBBbBB...................',
      '................................................',
    ],
    palette: {
      R: '#ef4444', // the envelope's stripes
      r: '#b91c1c',
      Y: '#facc15',
      y: '#ca8a04',
      H: '#fecaca', // where the sun catches it
      l: '#a8a29e', // ropes
      F: '#f97316', // the burner's flame
      f: '#fde68a',
      b: '#78350f', // the wicker basket
      B: '#92400e',
      c: '#e2e8f0', // clouds
    },
  },
} satisfies Record<string, DoorArt>;

export type DoorArtName = keyof typeof DOOR_ART;
