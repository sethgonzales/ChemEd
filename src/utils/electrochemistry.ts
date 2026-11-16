import {
  ATMOSPHERE,
  CIRCUIT_RESISTANCE,
  COUPLES,
  ELECTROLYSIS_POTENTIALS,
  ELECTROLYSIS_RESISTANCE,
  FARADAY,
  GAS_CONSTANT,
  HALF_CELL_VOLUME,
  ROOM_TEMPERATURE,
  type Couple,
} from '~/constants/electrochemistry';
import { ELEMENTS } from '~/constants/elements';

// below this, a half-cell's ions count as used up (M); also keeps ln finite
const USED_UP = 1e-6;

export interface HalfCell {
  electrode: string; // metal symbol
  solution: string; // symbol of the metal whose ions are in the solution
  concentration: number; // M
}

export interface Cell {
  left: HalfCell;
  right: HalfCell;
  saltBridge: boolean;
}

export type Side = 'left' | 'right';

export type HalfCellState =
  | 'ok' // a metal in its own ions
  | 'reacts' // the ions take electrons straight from the metal
  | 'no-own-ions'; // nothing to set the potential, so E° doesn't apply

export type CellStatus =
  | 'working'
  | 'no-salt-bridge'
  | 'no-difference'
  | 'reacts-in-beaker'
  | 'mismatched'
  | 'flat'; // the cathode's ions are used up

export interface CellReading {
  status: CellStatus;
  voltage: number; // V
  standardVoltage?: number; // E°cell, V
  anode?: Side;
  cathode?: Side;
}

export const coupleFor = (id: string): Couple =>
  COUPLES.find((c) => c.id === id)!;

export function halfCellState({
  electrode,
  solution,
}: HalfCell): HalfCellState {
  if (electrode === solution) return 'ok';
  return coupleFor(solution).eStandard > coupleFor(electrode).eStandard
    ? 'reacts'
    : 'no-own-ions';
}

/** Nernst for Mⁿ⁺ + ne⁻ → M: E = E° + (RT / nF) ln [Mⁿ⁺] */
export function electrodePotential(h: HalfCell, kelvin = ROOM_TEMPERATURE) {
  const c = coupleFor(h.electrode);
  const conc = Math.max(h.concentration, USED_UP);
  return (
    c.eStandard +
    ((GAS_CONSTANT * kelvin) / (c.charge * FARADAY)) * Math.log(conc)
  );
}

export function analyzeCell(cell: Cell): CellReading {
  const states = [halfCellState(cell.left), halfCellState(cell.right)];
  if (states.includes('reacts'))
    return { status: 'reacts-in-beaker', voltage: 0 };
  if (states.includes('no-own-ions'))
    return { status: 'mismatched', voltage: 0 };
  if (!cell.saltBridge) return { status: 'no-salt-bridge', voltage: 0 };

  const left = electrodePotential(cell.left);
  const right = electrodePotential(cell.right);
  if (Math.abs(left - right) < 1e-9)
    return { status: 'no-difference', voltage: 0 };

  const cathode: Side = right > left ? 'right' : 'left';
  const anode: Side = cathode === 'right' ? 'left' : 'right';
  if (cell[cathode].concentration < USED_UP) {
    return { status: 'flat', voltage: 0, anode, cathode };
  }
  return {
    status: 'working',
    voltage: Math.abs(right - left),
    standardVoltage:
      coupleFor(cell[cathode].electrode).eStandard -
      coupleFor(cell[anode].electrode).eStandard,
    anode,
    cathode,
  };
}

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const power = (k: number) =>
  k === 1 ? '' : [...String(k)].map((d) => SUPERSCRIPT[+d]).join('');
const times = (k: number, species: string) =>
  k === 1 ? species : `${k}${species}`;
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** A metal's half-equations: as many electrons as its ion's charge */
export function halfEquations(metal: string) {
  const { id, ion, charge } = coupleFor(metal);
  const e = `${charge === 1 ? '' : charge}e⁻`;
  return {
    oxidation: `${id} → ${ion} + ${e}`,
    reduction: `${ion} + ${e} → ${id}`,
  };
}

export interface CellReaction {
  oxidation: string; // at the anode
  reduction: string; // at the cathode
  overall: string;
  n: number; // electrons transferred in the overall equation
  quotient: string; // Q, written out
  q: number;
}

/** The working cell's reaction, balanced for electrons, with Q for the Nernst equation */
export function cellReaction(cell: Cell): CellReaction | null {
  const { status, anode, cathode } = analyzeCell(cell);
  if (status !== 'working') return null;
  const ox = coupleFor(cell[anode!].electrode);
  const red = coupleFor(cell[cathode!].electrode);

  // a·M + b·Nᵐ⁺ → a·Mⁿ⁺ + b·N, with both sides moving the same electrons
  const n = (ox.charge * red.charge) / gcd(ox.charge, red.charge);
  const [a, b] = [n / ox.charge, n / red.charge];
  const conc = (side: Side) => Math.max(cell[side].concentration, USED_UP);

  // a concentration cell has the same ion on both sides, so name them
  const same = ox.id === red.id;
  const [top, bottom] = same
    ? [`[${ox.ion}]anode`, `[${red.ion}]cathode`]
    : [`[${ox.ion}]${power(a)}`, `[${red.ion}]${power(b)}`];

  return {
    oxidation: halfEquations(ox.id).oxidation,
    reduction: halfEquations(red.id).reduction,
    overall: `${times(a, ox.id)} + ${times(b, red.ion)} → ${times(a, ox.ion)} + ${times(b, red.id)}`,
    n,
    quotient: `${top} / ${bottom}`,
    q: conc(anode!) ** a / conc(cathode!) ** b,
  };
}

/** Moles of metal each electrode has gained since `start` (negative: dissolved) */
export function metalChange(start: Cell, now: Cell): Record<Side, number> {
  // each electrode trades atoms with its own ions, so metal gained = ions lost
  const change = (side: Side) =>
    (start[side].concentration - now[side].concentration) * HALF_CELL_VOLUME ||
    0;
  return { left: change('left'), right: change('right') };
}

// mol of metal that fully thins an anode or coats a cathode in the drawings:
// a Daniell cell's 0.1 mol of Cu²⁺, so it reads 1 when that cell goes flat
const WEAR_SCALE = 0.1;

/** How far each electrode has thinned or been coated since `start`, 0 to 1 */
export function electrodeWear(start: Cell, now: Cell): Record<Side, number> {
  const change = metalChange(start, now);
  const wear = (side: Side) => Math.min(1, Math.abs(change[side]) / WEAR_SCALE);
  return { left: wear('left'), right: wear('right') };
}

// moves `electrons` mol of e⁻ through the wire: anode metal → ions, cathode ions → metal
function transfer(
  cell: Cell,
  anode: Side,
  cathode: Side,
  electrons: number,
): Cell {
  const change = (h: HalfCell, sign: number) => ({
    ...h,
    concentration: Math.max(
      0,
      h.concentration +
        (sign * electrons) / (coupleFor(h.electrode).charge * HALF_CELL_VOLUME),
    ),
  });
  return {
    ...cell,
    [anode]: change(cell[anode], 1),
    [cathode]: change(cell[cathode], -1),
  };
}

/** Lets the cell drive current through the bulb for `seconds` */
export function runCell(cell: Cell, seconds: number): Cell {
  const reading = analyzeCell(cell);
  if (reading.status !== 'working') return cell;
  const { anode, cathode } = reading as Required<CellReading>;

  const current = reading.voltage / CIRCUIT_RESISTANCE; // A
  const cathodeIons = cell[cathode].concentration * HALF_CELL_VOLUME;
  const maxElectrons = cathodeIons * coupleFor(cell[cathode].electrode).charge;
  let electrons = Math.min((current * seconds) / FARADAY, maxElectrons);

  // a long step mustn't carry the cell past equilibrium (where E = 0)
  const voltageAfter = (e: number) => {
    const next = transfer(cell, anode, cathode, e);
    const r = analyzeCell(next);
    return r.cathode === cathode ? r.voltage : -r.voltage;
  };
  if (electrons < maxElectrons && voltageAfter(electrons) < 0) {
    let [lo, hi] = [0, electrons];
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (voltageAfter(mid) < 0) hi = mid;
      else lo = mid;
    }
    electrons = lo;
  }
  return transfer(cell, anode, cathode, electrons);
}

export type ElectrolysisSetup = 'copper-plating' | 'water' | 'molten-nacl';

interface ElectrodeProduct {
  product: string;
  equation: string; // the half-reaction at this electrode
  electrons: number; // per formula unit made
  gas: boolean;
  element: string; // for the molar mass
  atoms: number; // per formula unit (2 for H₂)
}

// the half-reaction at each electrode of each setup
export const ELECTROLYSIS: Record<
  ElectrolysisSetup,
  { cathode: ElectrodeProduct; anode: ElectrodeProduct }
> = {
  // copper plates onto the cathode as the copper anode dissolves
  'copper-plating': {
    cathode: {
      product: 'Cu',
      equation: 'Cu²⁺ + 2e⁻ → Cu',
      electrons: 2,
      gas: false,
      element: 'Cu',
      atoms: 1,
    },
    anode: {
      product: 'Cu²⁺',
      equation: 'Cu → Cu²⁺ + 2e⁻',
      electrons: 2,
      gas: false,
      element: 'Cu',
      atoms: 1,
    },
  },
  // in dilute acid
  water: {
    cathode: {
      product: 'H₂',
      equation: '2H⁺ + 2e⁻ → H₂',
      electrons: 2,
      gas: true,
      element: 'H',
      atoms: 2,
    },
    anode: {
      product: 'O₂',
      equation: '2H₂O → O₂ + 4H⁺ + 4e⁻',
      electrons: 4,
      gas: true,
      element: 'O',
      atoms: 2,
    },
  },
  'molten-nacl': {
    cathode: {
      product: 'Na',
      equation: 'Na⁺ + e⁻ → Na',
      electrons: 1,
      gas: false,
      element: 'Na',
      atoms: 1,
    },
    anode: {
      product: 'Cl₂',
      equation: '2Cl⁻ → Cl₂ + 2e⁻',
      electrons: 2,
      gas: true,
      element: 'Cl',
      atoms: 2,
    },
  },
};

export const molarMass = (symbol: string) =>
  ELEMENTS.find((e) => e.symbol === symbol)!.atomicMass!;

export interface Product {
  product: string;
  moles: number;
  grams: number;
  litres?: number; // gases, as an ideal gas at 25 °C and 1 atm
}

/** Faraday's law: what `amps` for `seconds` makes at each electrode */
export function electrolysis(
  setup: ElectrolysisSetup,
  amps: number,
  seconds: number,
) {
  const electrons = (amps * seconds) / FARADAY;
  const make = (p: ElectrodeProduct): Product => {
    const moles = electrons / p.electrons;
    return {
      product: p.product,
      moles,
      grams: moles * p.atoms * molarMass(p.element),
      ...(p.gas && {
        litres: ((moles * GAS_CONSTANT * ROOM_TEMPERATURE) / ATMOSPHERE) * 1000,
      }),
    };
  };
  const { cathode, anode } = ELECTROLYSIS[setup];
  return { electrons, cathode: make(cathode), anode: make(anode) };
}

/**
 * The least voltage that drives the reaction: the gap between the E° of the
 * couple reduced at the cathode and the one oxidised at the anode. Real cells
 * need more (overpotential); molten NaCl uses 25 °C aqueous values, roughly.
 */
export function minimumVoltage(setup: ElectrolysisSetup) {
  const { hydrogen, oxygen, chlorine, sodium } = ELECTROLYSIS_POTENTIALS;
  switch (setup) {
    case 'water':
      return oxygen.eStandard - hydrogen.eStandard;
    case 'molten-nacl':
      return chlorine.eStandard - sodium.eStandard;
    default:
      return 0; // copper dissolves at one end and plates at the other
  }
}

/** Current through the electrolysis cell: whatever the supply has beyond the minimum */
export function electrolysisCurrent(setup: ElectrolysisSetup, volts: number) {
  return Math.max(0, volts - minimumVoltage(setup)) / ELECTROLYSIS_RESISTANCE;
}

/** Simulated time as "2 h 5 min" */
export function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

/** E° to two places, as on the AP table, so worked sums add up on screen */
export const tableValue = (v: number) => Math.round(v * 100) / 100;

/** A potential to two places, with a true minus sign */
export const formatPotential = (v: number) =>
  `${v < 0 ? '−' : ''}${Math.abs(v).toFixed(2)}`;

/** A potential being subtracted: negatives in brackets, so "0.34 − (−0.76)" reads right */
export const bracketed = (v: number) =>
  v < 0 ? `(−${Math.abs(v).toFixed(2)})` : v.toFixed(2);

/** A Predict-mode cell: two different metals, each in its own ions at 1 M */
export function newChallenge(random: () => number = Math.random): Cell {
  const ids = COUPLES.map((c) => c.id);
  const first = ids[Math.floor(random() * ids.length)];
  const rest = ids.filter((id) => id !== first);
  const second = rest[Math.floor(random() * rest.length)];
  const half = (id: string): HalfCell => ({
    electrode: id,
    solution: id,
    concentration: 1,
  });
  return { left: half(first), right: half(second), saltBridge: true };
}

export type PredictionVerdict =
  | 'correct'
  | 'wrong-anode'
  | 'wrong-volts'
  | 'both-wrong';

const PREDICTION_TOLERANCE = 0.02; // V: rounding E° first or last both count

/** Marks a student's anode and cell voltage for a working cell, with the reasoning */
export function checkPrediction(
  cell: Cell,
  guess: { anode: Side; volts: number },
) {
  const reading = analyzeCell(cell);
  const anode = reading.anode!;
  const ox = coupleFor(cell[anode].electrode);
  const red = coupleFor(cell[reading.cathode!].electrode);
  const [eA, eC] = [tableValue(ox.eStandard), tableValue(red.eStandard)];
  // the worked answer, carried to the cell's concentrations by Nernst
  const worked = eC - eA + (reading.voltage - reading.standardVoltage!);
  const near = (v: number) =>
    Math.abs(guess.volts - v) <= PREDICTION_TOLERANCE + 1e-9;

  const anodeRight = guess.anode === anode;
  const voltsRight = near(worked) || near(reading.voltage);
  const name = ox.metal.toLowerCase();
  const why = {
    anode: `The anode is the metal with the lower E°: ${name} (${formatPotential(eA)} V), so it’s oxidised.`,
    volts: `E°cell = E°cathode − E°anode = ${formatPotential(eC)} − ${bracketed(eA)} = ${worked.toFixed(2)} V.`,
  };
  const verdict: PredictionVerdict =
    anodeRight && voltsRight
      ? 'correct'
      : anodeRight
        ? 'wrong-volts'
        : voltsRight
          ? 'wrong-anode'
          : 'both-wrong';
  const text = {
    correct: `Right: ${name} is the anode, and the cell gives ${worked.toFixed(2)} V.`,
    'wrong-anode': `Right voltage, wrong anode. ${why.anode}`,
    'wrong-volts': `Right anode, but check the voltage. ${why.volts}`,
    'both-wrong': `Not quite. ${why.anode} ${why.volts}`,
  }[verdict];
  return { verdict, text };
}
