export const KW = 1e-14; // water's ion product at 25 °C

export const ANALYTE_VOLUME = 25; // mL in the flask
export const TITRANT_CONCENTRATION = 0.1; // M
export const BURETTE_CAPACITY = 50; // mL
export const DROP_VOLUME = 0.05; // mL, about one drop from a burette
export const POUR_RATE = 1.5; // mL/s with the tap held open

export interface Analyte {
  id: string;
  name: string;
  formula: string;
  kind: 'acid' | 'base';
  // pKa of each proton at 25 °C, ascending; for a weak base, its conjugate
  // acid's (NH₄⁺). Empty for a strong acid or base, which fully dissociates.
  pKas: number[];
  protons: number; // given up (acid) or taken up (base) per formula unit
  labConcentration: number; // M, in the Lab tab
}

// pKa values from Wikipedia's infoboxes (25 °C)
export const ANALYTES: Analyte[] = [
  {
    id: 'hcl',
    name: 'Hydrochloric acid',
    formula: 'HCl',
    kind: 'acid',
    pKas: [],
    protons: 1,
    labConcentration: 0.1,
  },
  {
    id: 'acetic',
    name: 'Acetic acid',
    formula: 'CH₃COOH',
    kind: 'acid',
    pKas: [4.756],
    protons: 1,
    labConcentration: 0.1,
  },
  {
    id: 'phosphoric',
    name: 'Phosphoric acid',
    formula: 'H₃PO₄',
    kind: 'acid',
    pKas: [2.14, 7.2, 12.37],
    protons: 3,
    // half strength, so both visible jumps (12.5 and 25 mL) fit the burette
    labConcentration: 0.05,
  },
  {
    id: 'naoh',
    name: 'Sodium hydroxide',
    formula: 'NaOH',
    kind: 'base',
    pKas: [],
    protons: 1,
    labConcentration: 0.1,
  },
  {
    id: 'ammonia',
    name: 'Ammonia',
    formula: 'NH₃',
    kind: 'base',
    pKas: [9.24],
    protons: 1,
    labConcentration: 0.1,
  },
];

export const titrantFor = (a: Analyte) => (a.kind === 'acid' ? 'NaOH' : 'HCl');

export interface Indicator {
  id: string;
  name: string;
  low: number; // pH where the colour starts to change
  high: number; // pH where it has finished
  colors: string[]; // low → high, as #rrggbbaa; a middle stop where the blend isn't a straight mix
  colorNames: string[]; // one per colour; a two-colour indicator is "pale" between
}

// transition ranges from Wikipedia's "pH indicator" table
export const INDICATORS: Indicator[] = [
  {
    id: 'methyl-orange',
    name: 'Methyl orange',
    low: 3.1,
    high: 4.4,
    colors: ['#dc2626e6', '#f97316e6', '#facc15e6'],
    colorNames: ['red', 'orange', 'yellow'],
  },
  {
    id: 'bromothymol-blue',
    name: 'Bromothymol blue',
    low: 6.0,
    high: 7.6,
    colors: ['#facc15e6', '#16a34ae6', '#2563ebe6'],
    colorNames: ['yellow', 'green', 'blue'],
  },
  {
    id: 'phenolphthalein',
    name: 'Phenolphthalein',
    low: 8.3,
    high: 10.0,
    colors: ['#ec489900', '#ec4899e6'],
    colorNames: ['colourless', 'pink'],
  },
];
