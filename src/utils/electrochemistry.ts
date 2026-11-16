import {
  ATMOSPHERE,
  CIRCUIT_RESISTANCE,
  COUPLES,
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
  const e = (k: number) => `${k === 1 ? '' : k}e⁻`;

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
    oxidation: `${ox.id} → ${ox.ion} + ${e(ox.charge)}`,
    reduction: `${red.ion} + ${e(red.charge)} → ${red.id}`,
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
  // Cu²⁺ + 2e⁻ → Cu at the cathode; the copper anode dissolves, Cu → Cu²⁺ + 2e⁻
  'copper-plating': {
    cathode: {
      product: 'Cu',
      electrons: 2,
      gas: false,
      element: 'Cu',
      atoms: 1,
    },
    anode: {
      product: 'Cu²⁺',
      electrons: 2,
      gas: false,
      element: 'Cu',
      atoms: 1,
    },
  },
  // 2H₂O + 2e⁻ → H₂ + 2OH⁻ and 2H₂O → O₂ + 4H⁺ + 4e⁻
  water: {
    cathode: { product: 'H₂', electrons: 2, gas: true, element: 'H', atoms: 2 },
    anode: { product: 'O₂', electrons: 4, gas: true, element: 'O', atoms: 2 },
  },
  // Na⁺ + e⁻ → Na and 2Cl⁻ → Cl₂ + 2e⁻
  'molten-nacl': {
    cathode: {
      product: 'Na',
      electrons: 1,
      gas: false,
      element: 'Na',
      atoms: 1,
    },
    anode: { product: 'Cl₂', electrons: 2, gas: true, element: 'Cl', atoms: 2 },
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
