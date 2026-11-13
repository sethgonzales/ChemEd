import { colord } from 'colord';
import {
  BLOCK_COLORS,
  CATEGORY_COLORS,
  NO_DATA_COLOR,
  TREND_STOPS,
} from '~/constants/blocks';
import { COVALENT_RADIUS } from '~/constants/covalent-radius';
import { ELECTRONEGATIVITY } from '~/constants/electronegativity';
import { ELEMENTS } from '~/constants/elements';
import type { IElementData } from '~/types';

export type Direction = 'left' | 'right' | 'up' | 'down';
export type ColorMode = 'block' | 'category' | 'electronegativity' | 'radius';
export type Category = 'metal' | 'metalloid' | 'nonmetal' | 'unknown';

// the staircase; At is usually drawn on it in school tables
const METALLOIDS = new Set(['B', 'Si', 'Ge', 'As', 'Sb', 'Te', 'At']);
// prettier-ignore
const NONMETALS = new Set([
  'H', 'He', 'C', 'N', 'O', 'F', 'Ne', 'P', 'S', 'Cl', 'Ar', 'Se', 'Br', 'Kr',
  'I', 'Xe', 'Rn',
]);
// from Mt on, too few atoms have been made to test their chemistry
const FIRST_UNKNOWN = 109;

export function elementCategory(el: IElementData): Category {
  if (el.atomicNumber >= FIRST_UNKNOWN) return 'unknown';
  if (METALLOIDS.has(el.symbol)) return 'metalloid';
  if (NONMETALS.has(el.symbol)) return 'nonmetal';
  return 'metal';
}

/** Each trend mode's values, and the range the colour scale spans */
export const TRENDS = {
  electronegativity: ELECTRONEGATIVITY,
  radius: COVALENT_RADIUS,
};

export function trendRange(mode: keyof typeof TRENDS) {
  const values = Object.values(TRENDS[mode]);
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** A colour from the trend scale, t = 0 (lowest) to 1 (highest) */
export function trendColor(t: number) {
  const x = Math.min(1, Math.max(0, t)) * (TREND_STOPS.length - 1);
  const i = Math.min(Math.floor(x), TREND_STOPS.length - 2);
  const f = x - i;
  const a = colord(TREND_STOPS[i]).toRgb();
  const b = colord(TREND_STOPS[i + 1]).toRgb();
  const mix = (p: number, q: number) => Math.round(p + (q - p) * f);
  return colord({
    r: mix(a.r, b.r),
    g: mix(a.g, b.g),
    b: mix(a.b, b.b),
  }).toHex();
}

export function elementColor(el: IElementData, mode: ColorMode) {
  if (mode === 'block') {
    return el.block ? BLOCK_COLORS[el.block] : NO_DATA_COLOR;
  }
  if (mode === 'category') {
    const category = elementCategory(el);
    return category === 'unknown' ? NO_DATA_COLOR : CATEGORY_COLORS[category];
  }
  const value = TRENDS[mode][el.symbol];
  if (value === undefined) return NO_DATA_COLOR;
  const { min, max } = trendRange(mode);
  return trendColor((value - min) / (max - min));
}

/**
 * Elements matching a search: an exact symbol or atomic number first, then
 * names that start with it, in atomic number order.
 */
export function searchElements(query: string): IElementData[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const exact = ELEMENTS.filter(
    (el) => el.symbol.toLowerCase() === q || String(el.atomicNumber) === q,
  );
  const named = ELEMENTS.filter(
    (el) => el.name.toLowerCase().startsWith(q) && !exact.includes(el),
  );
  return [...exact, ...named];
}

// main table periods, then the two f rows drawn below it (row 8 is the gap)
const ROWS = [1, 2, 3, 4, 5, 6, 7, 9, 10];
const COLS = 18;

/**
 * An element's (col, row) in the standard 18-column table. The f rows,
 * Ce–Lu and Th–Lr, sit in rows 9 and 10 under groups 4–17.
 */
export function gridPosition(el: IElementData): { col: number; row: number } {
  const { atomicNumber, period, group } = el;
  if (atomicNumber >= 58 && atomicNumber <= 71) {
    return { col: atomicNumber - 58 + 4, row: 9 };
  }
  if (atomicNumber >= 90 && atomicNumber <= 103) {
    return { col: atomicNumber - 90 + 4, row: 10 };
  }
  return { col: group ?? 1, row: period };
}

const byPosition = new Map(
  ELEMENTS.map((el) => {
    const { col, row } = gridPosition(el);
    return [`${col}-${row}`, el];
  }),
);

/** The element at a grid position, if any */
export const elementAt = (col: number, row: number) =>
  byPosition.get(`${col}-${row}`) ?? null;

/** The next element from `el` in a direction, skipping gaps; null at an edge */
export function neighbor(el: IElementData, direction: Direction) {
  const { col, row } = gridPosition(el);
  if (direction === 'left' || direction === 'right') {
    const dx = direction === 'right' ? 1 : -1;
    for (let c = col + dx; c >= 1 && c <= COLS; c += dx) {
      const found = elementAt(c, row);
      if (found) return found;
    }
    return null;
  }
  const dy = direction === 'down' ? 1 : -1;
  for (let i = ROWS.indexOf(row) + dy; i >= 0 && i < ROWS.length; i += dy) {
    const found = elementAt(col, ROWS[i]);
    if (found) return found;
  }
  return null;
}
