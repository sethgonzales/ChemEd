import type { SourceId } from './sources';

export const SOLUBILITY_SOURCE: SourceId = 'openstaxReactions';
export const STRONG_SOURCE: SourceId = 'openstaxStrength';

// OpenStax Chemistry 2e, Table 4.1. Cations are written symbol + charge, e.g.
// 'Pb2+'; 'Hg2 2+' is mercury(I), Hg₂²⁺.
const GROUP_2 = ['Be2+', 'Mg2+', 'Ca2+', 'Sr2+', 'Ba2+', 'Ra2+'];
const GROUP_1 = ['Li+', 'Na+', 'K+', 'Rb+', 'Cs+'];

/** Compounds of these cations are soluble, whatever the anion */
export const SOLUBLE_CATIONS = ['NH4+', ...GROUP_1];

export interface SolubilityRule {
  anions: string[];
  soluble: boolean; // compounds of these anions, unless the cation is an exception
  except: string[];
}

export const SOLUBILITY_RULES: SolubilityRule[] = [
  {
    anions: ['Cl', 'Br', 'I'],
    soluble: true,
    except: ['Ag+', 'Hg2 2+', 'Pb2+'],
  },
  { anions: ['F'], soluble: true, except: [...GROUP_2, 'Pb2+', 'Fe3+'] },
  { anions: ['C2H3O2', 'HCO3', 'NO3', 'ClO3'], soluble: true, except: [] },
  {
    anions: ['SO4'],
    soluble: true,
    except: ['Ag+', 'Ba2+', 'Ca2+', 'Hg2 2+', 'Pb2+', 'Sr2+'],
  },
  {
    anions: ['CO3', 'CrO4', 'PO4', 'S'],
    soluble: false,
    except: [...GROUP_1, 'NH4+'],
  },
  { anions: ['OH'], soluble: false, except: [...GROUP_1, 'Ba2+'] },
];

// OpenStax Chemistry 2e, Table 4.2 (acids) and Figure 14.6 (both)
export const STRONG_ACIDS = ['HClO4', 'HCl', 'HBr', 'HI', 'HNO3', 'H2SO4'];
export const STRONG_BASES = [
  'LiOH',
  'NaOH',
  'KOH',
  'Ca(OH)2',
  'Sr(OH)2',
  'Ba(OH)2',
];
