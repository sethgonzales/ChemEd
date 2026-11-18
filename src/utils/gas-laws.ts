import { ATMOSPHERE, GAS_CONSTANT, ZERO_CELSIUS } from '~/constants/physical';

// One solver for every gas law: PV = nRT. Boyle's, Charles's, Gay-Lussac's,
// Avogadro's and the combined law are all it with some quantities held fixed.

/** A gas in SI units: Pa, m³, mol, K */
export interface Gas {
  p: number;
  v: number;
  n: number;
  t: number;
}

const KEYS = ['p', 'v', 'n', 't'] as const;

/**
 * Fills in the one missing quantity. Given only `after`'s known values, it
 * uses PV = nRT; given a `before` state too, it uses P₁V₁/n₁T₁ = P₂V₂/n₂T₂,
 * so R cancels as it does in the combined law.
 */
export function solveGas(before: Partial<Gas>, after?: Partial<Gas>): Gas {
  const known = after ?? before;
  const missing = KEYS.filter((k) => known[k] === undefined);
  if (missing.length !== 1)
    throw new Error(`need exactly one unknown, got ${missing.length}`);
  // PV/nT, the same before and after; on its own it's R
  const k = after
    ? (before.p! * before.v!) / (before.n! * before.t!)
    : GAS_CONSTANT;
  const { p, v, n, t } = known as Gas;
  const solved = {
    p: () => (n * k * t) / v,
    v: () => (n * k * t) / p,
    n: () => (p * v) / (k * t),
    t: () => (p * v) / (n * k),
  }[missing[0]]();
  return { ...(known as Gas), [missing[0]]: solved };
}

/** Units students answer in, as [multiply by, then add] to reach SI */
const UNITS = {
  Pa: [1, 0],
  kPa: [1000, 0],
  atm: [ATMOSPHERE, 0],
  mmHg: [ATMOSPHERE / 760, 0], // 760 mmHg (torr) to the atmosphere
  'm³': [1, 0],
  L: [0.001, 0],
  mL: [0.000001, 0],
  K: [1, 0],
  '°C': [1, ZERO_CELSIUS],
  mol: [1, 0],
} as const;

export type GasUnit = keyof typeof UNITS;

export const toSI = (value: number, unit: GasUnit) =>
  value * UNITS[unit][0] + UNITS[unit][1];

export const fromSI = (value: number, unit: GasUnit) =>
  (value - UNITS[unit][1]) / UNITS[unit][0];
