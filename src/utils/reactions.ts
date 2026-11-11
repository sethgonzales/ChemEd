import { findElement } from '~/utils';

export type Reaction = { reactants: string[]; products: string[] };

export type TallyRow = { element: string; reactants: number; products: number };

const MAX_TILT = 12; // degrees; any steeper and a wide seesaw's ends leave the panel
const TILT_PER_SHARE = 40; // degrees of tilt per unit of relative difference

const ARROW = /->|→|=/;

/** Atom counts in a formula, including (nested) brackets: Ca3(PO4)2 → Ca 3, P 2, O 8 */
export function parseCompound(formula: string): Record<string, number> {
  if (!/^[A-Z([]/.test(formula)) {
    throw new Error(`Malformed formula: ${formula || '(empty)'}`);
  }
  let i = 0;

  const number = () => {
    const match = /^\d+/.exec(formula.slice(i));
    if (!match) return 1;
    i += match[0].length;
    return Number(match[0]);
  };

  const group = (close?: string): Record<string, number> => {
    const counts: Record<string, number> = {};
    const add = (part: Record<string, number>, times: number) => {
      for (const [el, n] of Object.entries(part)) {
        counts[el] = (counts[el] ?? 0) + n * times;
      }
    };
    while (i < formula.length) {
      const ch = formula[i];
      if (ch === close) {
        i += 1;
        return counts;
      }
      if (ch === '(' || ch === '[') {
        i += 1;
        const inner = group(ch === '(' ? ')' : ']');
        add(inner, number());
        continue;
      }
      const match = /^[A-Z][a-z]?/.exec(formula.slice(i));
      if (!match) throw new Error(`Malformed formula: ${formula}`);
      if (!findElement(match[0])) {
        throw new Error(`Unknown element: ${match[0]}`);
      }
      i += match[0].length;
      add({ [match[0]]: 1 }, number());
    }
    if (close) throw new Error(`Unclosed bracket in ${formula}`);
    return counts;
  };

  const counts = group();
  if (i < formula.length) throw new Error(`Malformed formula: ${formula}`);
  return counts;
}

/** 'CH4 + O2 -> CO2 + H2O' (→ or = also work; coefficients are ignored) */
export function parseEquation(equation: string): Reaction {
  const sides = equation.split(ARROW);
  if (sides.length !== 2) {
    throw new Error('Use an arrow (->) between reactants and products.');
  }
  const [reactants, products] = sides.map((side) =>
    side
      .split('+')
      .map((part) => part.trim().replace(/^\d+\s*/, ''))
      .filter(Boolean),
  );
  if (!reactants.length || !products.length) {
    throw new Error('Each side needs at least one formula.');
  }
  // throws with the problem, e.g. an unknown element
  [...reactants, ...products].forEach(parseCompound);
  return { reactants, products };
}

const compounds = (r: Reaction) => [...r.reactants, ...r.products];

/** Each element's atom count on both sides, in order of first appearance */
export function elementTally(r: Reaction, coefficients: number[]): TallyRow[] {
  const rows = new Map<string, TallyRow>();
  compounds(r).forEach((formula, i) => {
    const side = i < r.reactants.length ? 'reactants' : 'products';
    for (const [element, n] of Object.entries(parseCompound(formula))) {
      const row = rows.get(element) ?? { element, reactants: 0, products: 0 };
      row[side] += n * (coefficients[i] ?? 0);
      rows.set(element, row);
    }
  });
  return [...rows.values()];
}

/** Total atoms on each side, whatever the elements */
export function atomTotals(r: Reaction, coefficients: number[]) {
  return elementTally(r, coefficients).reduce(
    (sum, row) => ({
      reactants: sum.reactants + row.reactants,
      products: sum.products + row.products,
    }),
    { reactants: 0, products: 0 },
  );
}

export function isBalanced(r: Reaction, coefficients: number[]) {
  return (
    coefficients.length === compounds(r).length &&
    coefficients.every((c) => Number.isInteger(c) && c > 0) &&
    elementTally(r, coefficients).every((row) => row.reactants === row.products)
  );
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const lcm = (a: number, b: number) => (a / gcd(a, b)) * b;

/** No factor shared by every coefficient (2, 1, 2 rather than 4, 2, 4) */
export const isLowestTerms = (coefficients: number[]) =>
  coefficients.reduce(gcd, 0) === 1;

// Exact fractions, so elimination never rounds
type Frac = { n: number; d: number };
const frac = (n: number, d = 1): Frac => {
  const g = gcd(n, d) || 1;
  const sign = d < 0 ? -1 : 1;
  return { n: (sign * n) / g, d: (sign * d) / g };
};
const sub = (a: Frac, b: Frac) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Frac, b: Frac) => frac(a.n * b.n, a.d * b.d);
const div = (a: Frac, b: Frac) => frac(a.n * b.d, a.d * b.n);

/**
 * The smallest positive whole-number coefficients, or null if the equation
 * can't be balanced or has more than one independent way to balance it.
 */
export function solve(r: Reaction): number[] | null {
  const all = compounds(r);
  const tally = elementTally(
    r,
    all.map(() => 1),
  );
  // one row per element: atoms in each compound, products counted negative
  const matrix = tally.map(({ element }) =>
    all.map((formula, i) => {
      const n = parseCompound(formula)[element] ?? 0;
      return frac(i < r.reactants.length ? n : -n);
    }),
  );

  // reduced row echelon form
  const pivots: number[] = [];
  let row = 0;
  for (let col = 0; col < all.length && row < matrix.length; col++) {
    const p = matrix.findIndex((m, k) => k >= row && m[col].n !== 0);
    if (p === -1) continue;
    [matrix[row], matrix[p]] = [matrix[p], matrix[row]];
    const lead = matrix[row][col];
    matrix[row] = matrix[row].map((v) => div(v, lead));
    matrix.forEach((m, k) => {
      if (k === row || m[col].n === 0) return;
      const factor = m[col];
      matrix[k] = m.map((v, c) => sub(v, mul(factor, matrix[row][c])));
    });
    pivots.push(col);
    row += 1;
  }

  const free = all.map((_, c) => c).filter((c) => !pivots.includes(c));
  if (free.length !== 1) return null;

  // the free coefficient is 1; each pivot coefficient follows from its row
  const vector: Frac[] = all.map(() => frac(0));
  vector[free[0]] = frac(1);
  pivots.forEach((col, k) => {
    vector[col] = frac(-matrix[k][free[0]].n, matrix[k][free[0]].d);
  });

  const scale = vector.reduce((l, v) => lcm(l, v.d), 1);
  let whole = vector.map((v) => (v.n * scale) / v.d);
  const common = whole.reduce(gcd, 0);
  whole = whole.map((v) => v / common);
  if (whole.every((v) => v < 0)) whole = whole.map((v) => -v);
  return whole.every((v) => v > 0) ? whole : null;
}

/** Tilt in degrees for two sides' weights: positive tips toward the products (right) */
export function beamAngle(reactants: number, products: number) {
  const heavier = Math.max(reactants, products);
  if (!heavier) return 0;
  const share = (products - reactants) / heavier;
  return Math.max(-MAX_TILT, Math.min(MAX_TILT, share * TILT_PER_SHARE));
}
