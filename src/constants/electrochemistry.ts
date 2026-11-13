import type { SourceId } from '~/constants/sources';

// exact in the 2019 SI (F = Nₐe, R = Nₐk)
export const FARADAY = 96485.33212; // C/mol
export const GAS_CONSTANT = 8.314462618; // J/(mol·K)
export const ROOM_TEMPERATURE = 298.15; // K
export const ATMOSPHERE = 101325; // Pa
export const CONSTANTS_SOURCE: SourceId = 'codata';

export const HALF_CELL_VOLUME = 0.1; // L of solution in each beaker
export const CIRCUIT_RESISTANCE = 10; // Ω, the bulb and the cell together

export interface Couple {
  id: string; // the metal's symbol
  metal: string;
  ion: string; // e.g. 'Zn²⁺'
  charge: number; // electrons per ion reduced
  eStandard: number; // V vs SHE, 25 °C, 1 M
  solution: string; // a soluble salt of the ion
  color: string; // the solution's colour, roughly; transparent if colourless
  source: SourceId;
}

const COLOURLESS = '#00000000';

// Standard reduction potentials as tabulated in the cited data page, which
// credits each row: Mg, Zn, Ni, Ag from the CRC Handbook (Vanýsek); Al from
// the CRC (Lide); Fe and Pb from Atkins; Cu from Bard, Parsons & Jordan.
export const COUPLES: Couple[] = [
  {
    id: 'Mg',
    metal: 'Magnesium',
    ion: 'Mg²⁺',
    charge: 2,
    eStandard: -2.372,
    solution: 'Mg(NO₃)₂',
    color: COLOURLESS,
    source: 'electrodePotentials',
  },
  {
    id: 'Al',
    metal: 'Aluminium',
    ion: 'Al³⁺',
    charge: 3,
    eStandard: -1.662,
    solution: 'Al(NO₃)₃',
    color: COLOURLESS,
    source: 'electrodePotentials',
  },
  {
    id: 'Zn',
    metal: 'Zinc',
    ion: 'Zn²⁺',
    charge: 2,
    eStandard: -0.7618,
    solution: 'Zn(NO₃)₂',
    color: COLOURLESS,
    source: 'electrodePotentials',
  },
  {
    id: 'Fe',
    metal: 'Iron',
    ion: 'Fe²⁺',
    charge: 2,
    eStandard: -0.44,
    solution: 'Fe(NO₃)₂',
    color: '#bef26480',
    source: 'electrodePotentials',
  },
  {
    id: 'Ni',
    metal: 'Nickel',
    ion: 'Ni²⁺',
    charge: 2,
    eStandard: -0.257,
    solution: 'Ni(NO₃)₂',
    color: '#4ade8099',
    source: 'electrodePotentials',
  },
  {
    id: 'Pb',
    metal: 'Lead',
    ion: 'Pb²⁺',
    charge: 2,
    eStandard: -0.126,
    solution: 'Pb(NO₃)₂',
    color: COLOURLESS,
    source: 'electrodePotentials',
  },
  {
    id: 'Cu',
    metal: 'Copper',
    ion: 'Cu²⁺',
    charge: 2,
    eStandard: 0.337,
    solution: 'Cu(NO₃)₂',
    color: '#3b82f6b3',
    source: 'electrodePotentials',
  },
  {
    id: 'Ag',
    metal: 'Silver',
    ion: 'Ag⁺',
    charge: 1,
    eStandard: 0.7996,
    solution: 'AgNO₃',
    color: COLOURLESS,
    source: 'electrodePotentials',
  },
];
