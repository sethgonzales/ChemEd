export type BalancingReaction = {
  id: string;
  name: string;
  level: 1 | 2 | 3 | 4;
  equation: string; // unbalanced, e.g. 'H2 + O2 -> H2O'
  answer: number[]; // smallest whole-number coefficients, reactants then products
};

export const REACTION_LEVELS: Record<BalancingReaction['level'], string> = {
  1: 'Synthesis and decomposition',
  2: 'Combustion',
  3: 'Single and double replacement',
  4: 'Redox (college)',
};

export const REACTIONS: BalancingReaction[] = [
  // Level 1: synthesis and decomposition
  {
    id: 'water',
    name: 'Making water',
    level: 1,
    equation: 'H2 + O2 -> H2O',
    answer: [2, 1, 2],
  },
  {
    id: 'ammonia',
    name: 'Haber process',
    level: 1,
    equation: 'N2 + H2 -> NH3',
    answer: [1, 3, 2],
  },
  {
    id: 'sodium-chloride',
    name: 'Sodium and chlorine',
    level: 1,
    equation: 'Na + Cl2 -> NaCl',
    answer: [2, 1, 2],
  },
  {
    id: 'magnesium-oxide',
    name: 'Burning magnesium',
    level: 1,
    equation: 'Mg + O2 -> MgO',
    answer: [2, 1, 2],
  },
  {
    id: 'aluminium-oxide',
    name: 'Aluminium oxide',
    level: 1,
    equation: 'Al + O2 -> Al2O3',
    answer: [4, 3, 2],
  },
  {
    id: 'rust',
    name: 'Rusting iron',
    level: 1,
    equation: 'Fe + O2 -> Fe2O3',
    answer: [4, 3, 2],
  },
  {
    id: 'hydrogen-peroxide',
    name: 'Hydrogen peroxide decomposing',
    level: 1,
    equation: 'H2O2 -> H2O + O2',
    answer: [2, 2, 1],
  },
  {
    id: 'potassium-chlorate',
    name: 'Heating potassium chlorate',
    level: 1,
    equation: 'KClO3 -> KCl + O2',
    answer: [2, 2, 3],
  },

  // Level 2: combustion
  {
    id: 'methane',
    name: 'Burning methane',
    level: 2,
    equation: 'CH4 + O2 -> CO2 + H2O',
    answer: [1, 2, 1, 2],
  },
  {
    id: 'ethane',
    name: 'Burning ethane',
    level: 2,
    equation: 'C2H6 + O2 -> CO2 + H2O',
    answer: [2, 7, 4, 6],
  },
  {
    id: 'propane',
    name: 'Burning propane',
    level: 2,
    equation: 'C3H8 + O2 -> CO2 + H2O',
    answer: [1, 5, 3, 4],
  },
  {
    id: 'butane',
    name: 'Burning butane',
    level: 2,
    equation: 'C4H10 + O2 -> CO2 + H2O',
    answer: [2, 13, 8, 10],
  },
  {
    id: 'ethanol',
    name: 'Burning ethanol',
    level: 2,
    equation: 'C2H5OH + O2 -> CO2 + H2O',
    answer: [1, 3, 2, 3],
  },
  {
    id: 'glucose',
    name: 'Respiration (glucose)',
    level: 2,
    equation: 'C6H12O6 + O2 -> CO2 + H2O',
    answer: [1, 6, 6, 6],
  },

  // Level 3: single and double replacement
  {
    id: 'zinc-acid',
    name: 'Zinc in hydrochloric acid',
    level: 3,
    equation: 'Zn + HCl -> ZnCl2 + H2',
    answer: [1, 2, 1, 1],
  },
  {
    id: 'aluminium-copper-sulfate',
    name: 'Aluminium and copper sulfate',
    level: 3,
    equation: 'Al + CuSO4 -> Al2(SO4)3 + Cu',
    answer: [2, 3, 1, 3],
  },
  {
    id: 'lead-iodide',
    name: 'Golden rain (lead iodide)',
    level: 3,
    equation: 'Pb(NO3)2 + KI -> PbI2 + KNO3',
    answer: [1, 2, 1, 2],
  },
  {
    id: 'silver-chloride',
    name: 'Silver chloride precipitate',
    level: 3,
    equation: 'AgNO3 + CaCl2 -> AgCl + Ca(NO3)2',
    answer: [2, 1, 2, 1],
  },
  {
    id: 'sulfuric-acid-neutralisation',
    name: 'Neutralising sulfuric acid',
    level: 3,
    equation: 'H2SO4 + NaOH -> Na2SO4 + H2O',
    answer: [1, 2, 1, 2],
  },
  {
    id: 'calcium-phosphate',
    name: 'Calcium phosphate',
    level: 3,
    equation: 'Ca(OH)2 + H3PO4 -> Ca3(PO4)2 + H2O',
    answer: [3, 2, 1, 6],
  },
  {
    id: 'magnesium-phosphate',
    name: 'Magnesium phosphate precipitate',
    level: 3,
    equation: 'Na3PO4 + MgCl2 -> Mg3(PO4)2 + NaCl',
    answer: [2, 3, 1, 6],
  },

  // Level 4: redox
  {
    id: 'iron-smelting',
    name: 'Smelting iron ore',
    level: 4,
    equation: 'Fe2O3 + CO -> Fe + CO2',
    answer: [1, 3, 2, 3],
  },
  {
    id: 'ostwald',
    name: 'Oxidising ammonia (Ostwald process)',
    level: 4,
    equation: 'NH3 + O2 -> NO + H2O',
    answer: [4, 5, 4, 6],
  },
  {
    id: 'copper-dilute-nitric',
    name: 'Copper in dilute nitric acid',
    level: 4,
    equation: 'Cu + HNO3 -> Cu(NO3)2 + NO + H2O',
    answer: [3, 8, 3, 2, 4],
  },
  {
    id: 'copper-concentrated-nitric',
    name: 'Copper in concentrated nitric acid',
    level: 4,
    equation: 'Cu + HNO3 -> Cu(NO3)2 + NO2 + H2O',
    answer: [1, 4, 1, 2, 2],
  },
  {
    id: 'permanganate',
    name: 'Permanganate and hydrochloric acid',
    level: 4,
    equation: 'KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O',
    answer: [2, 16, 2, 2, 5, 8],
  },
  {
    id: 'dichromate',
    name: 'Dichromate and hydrochloric acid',
    level: 4,
    equation: 'K2Cr2O7 + HCl -> KCl + CrCl3 + Cl2 + H2O',
    answer: [1, 14, 2, 2, 3, 7],
  },
];
